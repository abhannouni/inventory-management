import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PERMISSION_CODES } from './permissions';

/**
 * Resolves the effective permission codes for a user.
 *
 * Role → permission lookups happen on every guarded request, so results are
 * cached in memory per role. Any write to a role's permissions must call
 * `invalidate()` (or `invalidateAll()`) or the change will not take effect until
 * the TTL lapses.
 */
@Injectable()
export class PermissionsService {
  private readonly cache = new Map<string, { codes: Set<string>; expiresAt: number }>();
  private static readonly TTL_MS = 60_000;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * super_admin bypasses the lookup entirely and receives every permission, so a
   * misconfigured role table can never lock the platform's owner out.
   */
  async forUser(user: {
    role: UserRole;
    role_id: string | null;
  }): Promise<Set<string>> {
    if (user.role === UserRole.super_admin) return new Set(PERMISSION_CODES);
    if (!user.role_id) return this.byRoleName(user.role);
    return this.byRoleId(user.role_id);
  }

  async byRoleId(roleId: string): Promise<Set<string>> {
    const cached = this.cache.get(roleId);
    if (cached && cached.expiresAt > Date.now()) return cached.codes;

    const rows = await this.prisma.rolePermission.findMany({
      where: { role_id: roleId },
      include: { permission: { select: { code: true } } },
    });

    const codes = new Set(rows.map((r) => r.permission.code));
    this.cache.set(roleId, { codes, expiresAt: Date.now() + PermissionsService.TTL_MS });
    return codes;
  }

  /** Fallback for users created before `role_id` existed: resolve via the legacy enum. */
  private async byRoleName(name: UserRole): Promise<Set<string>> {
    const role = await this.prisma.role.findUnique({ where: { name } });
    if (!role) return new Set();
    return this.byRoleId(role.id);
  }

  invalidate(roleId: string): void {
    this.cache.delete(roleId);
  }

  invalidateAll(): void {
    this.cache.clear();
  }
}
