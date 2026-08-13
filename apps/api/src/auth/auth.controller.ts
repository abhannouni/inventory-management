import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request as ExpressRequest, Response } from 'express';
import { AuthService, IssuedTokens } from './auth.service';
import { RequirePermissions } from './decorators/require-permissions.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';

const REFRESH_COOKIE = 'refresh_token';
const REFRESH_COOKIE_PATH = '/api/auth';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Requires an authenticated admin, same as POST /users - without this, any
  // unauthenticated caller could self-provision an account with an arbitrary
  // role (e.g. "super_admin") since RegisterDto accepts a client-supplied role.
  @Post('register')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('users.create')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register a new user (admin only)' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login and receive an access token' })
  @ApiOkResponse({ schema: { example: { access_token: 'eyJ...' } } })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.login(dto);
    this.setRefreshCookie(res, tokens);
    return { access_token: tokens.accessToken };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange the refresh cookie for a new access token' })
  @ApiOkResponse({ schema: { example: { access_token: 'eyJ...' } } })
  async refresh(@Req() req: ExpressRequest, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.refresh(req.cookies?.[REFRESH_COOKIE]);
    this.setRefreshCookie(res, tokens);
    return { access_token: tokens.accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke the current refresh token and clear its cookie' })
  async logout(@Req() req: ExpressRequest, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req.cookies?.[REFRESH_COOKIE]);
    const isProd = process.env.NODE_ENV === 'production';
    res.clearCookie(REFRESH_COOKIE, {
      path: REFRESH_COOKIE_PATH,
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
    });
    return { success: true };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the authenticated user profile' })
  me(@Request() req: Express.Request & { user: { id: string } }) {
    return this.authService.me(req.user.id);
  }

  private setRefreshCookie(res: Response, tokens: IssuedTokens) {
    // In production the web and api apps are separate Railway services on
    // different origins, so the refresh call is genuinely cross-site: it
    // needs `SameSite=None` (which in turn requires `Secure`) or browsers
    // drop the cookie silently. Locally, frontend and api differ only by
    // port over plain http, where `Lax` works and `None` would require a
    // Secure flag http can't satisfy.
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: REFRESH_COOKIE_PATH,
      expires: tokens.refreshExpiresAt,
    });
  }
}
