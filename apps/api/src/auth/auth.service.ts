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
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { PermissionsService } from './permissions.service';

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

  async login(dto: LoginDto) {
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

    return { access_token: this.sign(user) };
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

  private sign(user: User): string {
    return this.jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get('JWT_ACCESS_EXPIRES') as any,
      },
    );
  }

  private sanitize<T extends User>(user: T) {
    const { password: _, ...rest } = user;
    return rest;
  }
}
