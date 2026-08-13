import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PermissionsService } from './permissions.service';

interface RefreshPayload {
  sub: string;
  jti: string;
}

// A refresh token that was already rotated but gets presented again within
// this window is treated as a benign race (e.g. two tabs refreshing around
// the same 15-minute access-token expiry) rather than theft. Past this
// window, reuse of a rotated token is assumed to be a replayed/stolen token.
const REUSE_GRACE_MS = 10_000;

export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly permissions: PermissionsService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already in use');

    const hashed = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        full_name: dto.full_name,
        email: dto.email,
        password: hashed,
        role: dto.role,
        region_id: dto.region_id ?? null,
      },
    });
    return this.sanitize(user);
  }

  async login(dto: LoginDto): Promise<IssuedTokens> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !(await bcrypt.compare(dto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.is_active) {
      throw new ForbiddenException('Account is deactivated. Contact an administrator.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    return this.issueTokens(user);
  }

  /**
   * Verifies the refresh token cookie, rotates it (old one is revoked, a new
   * one is issued), and mints a fresh access token. Rotation means a stolen
   * refresh token stops working the moment the legitimate client uses theirs
   * next, instead of staying valid for its whole 7-day lifetime.
   */
  async refresh(rawToken: string | undefined): Promise<IssuedTokens> {
    if (!rawToken) throw new UnauthorizedException('Missing refresh token');

    let payload: RefreshPayload;
    try {
      payload = this.jwt.verify<RefreshPayload>(rawToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokenHash = this.hash(rawToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { token_hash: tokenHash } });

    if (!stored || stored.expires_at < new Date()) {
      throw new UnauthorizedException('Refresh token no longer valid');
    }

    if (stored.revoked_at) {
      const reusedRecently = Date.now() - stored.revoked_at.getTime() < REUSE_GRACE_MS;
      if (!reusedRecently) {
        // A validly-signed token that was rotated away a while ago is being
        // reused - most likely a stolen/replayed token. Revoke every session
        // for this user as a precaution.
        await this.prisma.refreshToken.updateMany({
          where: { user_id: payload.sub, revoked_at: null },
          data: { revoked_at: new Date() },
        });
        throw new UnauthorizedException('Refresh token no longer valid');
      }
      // Rotated moments ago: almost certainly two concurrent requests (e.g.
      // two open tabs) racing to refresh the same token, not theft. Fall
      // through and issue a fresh pair rather than tearing down every
      // session - each caller gets its own valid refresh token below.
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.is_active) {
      throw new UnauthorizedException('Account no longer active');
    }

    if (!stored.revoked_at) {
      await this.prisma.refreshToken.update({
        where: { id: stored.id },
        data: { revoked_at: new Date() },
      });
    }

    return this.issueTokens(user);
  }

  async logout(rawToken: string | undefined) {
    if (!rawToken) return;
    const tokenHash = this.hash(rawToken);
    await this.prisma.refreshToken
      .updateMany({ where: { token_hash: tokenHash, revoked_at: null }, data: { revoked_at: new Date() } })
      .catch(() => undefined);
  }

  async me(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { region: true, custom_role: true },
    });
    if (!user) throw new UnauthorizedException();

    const permissions = await this.permissions.forUser(user);
    return { ...this.sanitize(user), permissions: [...permissions] };
  }

  private async issueTokens(user: User): Promise<IssuedTokens> {
    const accessToken = this.signAccessToken(user);
    const jti = randomUUID();
    const refreshToken = this.jwt.sign(
      { sub: user.id, jti },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES') as any,
      },
    );

    const { exp } = this.jwt.decode(refreshToken) as { exp: number };
    const refreshExpiresAt = new Date(exp * 1000);

    await this.prisma.refreshToken.create({
      data: {
        user_id: user.id,
        token_hash: this.hash(refreshToken),
        expires_at: refreshExpiresAt,
      },
    });

    return { accessToken, refreshToken, refreshExpiresAt };
  }

  private signAccessToken(user: User): string {
    return this.jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES') as any,
      },
    );
  }

  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private sanitize<T extends User>(user: T) {
    const { password: _, ...rest } = user;
    return rest;
  }
}
