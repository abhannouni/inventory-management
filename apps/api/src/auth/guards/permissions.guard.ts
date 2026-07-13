import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { User } from '@prisma/client';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { PermissionsService } from '../permissions.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissions: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required?.length) return true;

    const user = context.switchToHttp().getRequest().user as User | undefined;
    if (!user) throw new ForbiddenException('Not authenticated');

    const granted = await this.permissions.forUser(user);
    const missing = required.filter((code) => !granted.has(code));

    if (missing.length) {
      throw new ForbiddenException(
        `Missing required permission${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`,
      );
    }
    return true;
  }
}
