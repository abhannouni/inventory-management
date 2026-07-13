import { PrismaClient, UserRole } from '@prisma/client';
import { PERMISSIONS, ROLE_PRESETS } from '../src/auth/permissions';

const ROLE_LABELS: Record<string, { label: string; description: string }> = {
  super_admin: {
    label: 'Super Administrator',
    description: 'Unrestricted access to every module, setting and record.',
  },
  admin: {
    label: 'Administrator',
    description: 'Manages users, clients, points of sale and the product catalogue.',
  },
  general_management: {
    label: 'General Management',
    description: 'Read-only consolidated view, limited to the points of sale exposed to it.',
  },
  supervisor: {
    label: 'Supervisor',
    description: 'Plans and reviews the field work of merchandisers.',
  },
  merchandiser: {
    label: 'Merchandiser',
    description: 'Performs in-store visits and shelf audits.',
  },
};

/**
 * Idempotently reconciles the database with the permission catalogue:
 * upserts every permission, every built-in role, and each built-in role's preset
 * grants; then backfills `users.role_id` from the legacy `users.role` enum.
 *
 * Safe to run against a populated database — it only adds and relinks, and it
 * leaves custom roles and any hand-edited grants on system roles alone.
 */
export async function syncRbac(prisma: PrismaClient) {
  // 1. Permissions
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: { resource: p.resource, action: p.action, description: p.description },
      create: p,
    });
  }

  const allPermissions = await prisma.permission.findMany();
  const idByCode = new Map(allPermissions.map((p) => [p.code, p.id]));

  // 2. Built-in roles — one per UserRole enum member, so the legacy column always maps.
  const roleIdByName = new Map<string, string>();

  for (const name of Object.values(UserRole)) {
    const meta = ROLE_LABELS[name];
    const role = await prisma.role.upsert({
      where: { name },
      update: { label: meta.label, description: meta.description, is_system: true },
      create: {
        name,
        label: meta.label,
        description: meta.description,
        is_system: true,
      },
    });
    roleIdByName.set(name, role.id);
  }

  // 3. Grants. super_admin gets everything; the rest get their preset.
  for (const [name, roleId] of roleIdByName) {
    const codes =
      name === UserRole.super_admin
        ? PERMISSIONS.map((p) => p.code)
        : (ROLE_PRESETS[name] ?? []);

    for (const code of codes) {
      const permissionId = idByCode.get(code);
      if (!permissionId) throw new Error(`Unknown permission code in preset: ${code}`);

      await prisma.rolePermission.upsert({
        where: {
          role_id_permission_id: { role_id: roleId, permission_id: permissionId },
        },
        update: {},
        create: { role_id: roleId, permission_id: permissionId },
      });
    }
  }

  // 4. Backfill role_id for users still relying on the enum alone.
  for (const [name, roleId] of roleIdByName) {
    await prisma.user.updateMany({
      where: { role: name as UserRole, role_id: null },
      data: { role_id: roleId },
    });
  }

  return {
    permissions: allPermissions.length,
    roles: roleIdByName.size,
  };
}
