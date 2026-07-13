import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PermissionsService } from '../auth/permissions.service';
import { PERMISSIONS } from '../auth/permissions';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoleDto, SetRolePermissionsDto, UpdateRoleDto } from './dto/role.dto';

@Injectable()
export class RolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
  ) {}

  async findAll() {
    const roles = await this.prisma.role.findMany({
      orderBy: [{ is_system: 'desc' }, { name: 'asc' }],
      include: {
        _count: { select: { users: true, permissions: true } },
      },
    });

    return roles.map((r) => ({
      ...r,
      user_count: r._count.users,
      permission_count: r._count.permissions,
    }));
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    });
    if (!role) throw new NotFoundException('Role not found');

    return {
      ...role,
      user_count: role._count.users,
      permissions: role.permissions.map((rp) => rp.permission.code),
    };
  }

  /** The full catalogue, grouped by resource — drives the permission matrix UI. */
  async catalogue() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }],
    });

    const byResource = new Map<string, typeof permissions>();
    for (const p of permissions) {
      const list = byResource.get(p.resource) ?? [];
      list.push(p);
      byResource.set(p.resource, list);
    }

    return [...byResource.entries()].map(([resource, items]) => ({ resource, permissions: items }));
  }

  async create(dto: CreateRoleDto) {
    const exists = await this.prisma.role.findUnique({ where: { name: dto.name } });
    if (exists) throw new ConflictException(`A role named "${dto.name}" already exists`);

    const role = await this.prisma.role.create({
      data: {
        name: dto.name,
        label: dto.label,
        description: dto.description ?? null,
        is_system: false,
      },
    });

    if (dto.permissions?.length) {
      await this.setPermissions(role.id, { permissions: dto.permissions });
    }
    return this.findOne(role.id);
  }

  /** System roles keep their machine name; only their label/description are editable. */
  async update(id: string, dto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');

    await this.prisma.role.update({
      where: { id },
      data: {
        label: dto.label ?? role.label,
        description: dto.description !== undefined ? dto.description : role.description,
      },
    });
    return this.findOne(id);
  }

  async remove(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!role) throw new NotFoundException('Role not found');

    if (role.is_system) {
      throw new BadRequestException('Built-in roles cannot be deleted');
    }
    if (role._count.users > 0) {
      throw new BadRequestException(
        `Cannot delete a role that is still assigned to ${role._count.users} user(s). Reassign them first.`,
      );
    }

    await this.prisma.role.delete({ where: { id } });
    this.permissions.invalidate(id);
  }

  /**
   * Replaces a role's grants wholesale.
   *
   * super_admin is refused outright: stripping it would leave nobody able to
   * restore permissions, locking the platform permanently.
   */
  async setPermissions(id: string, dto: SetRolePermissionsDto) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException('Role not found');

    if (role.name === UserRole.super_admin) {
      throw new BadRequestException(
        'The Super Administrator role always holds every permission and cannot be edited',
      );
    }

    const known = new Set(PERMISSIONS.map((p) => p.code));
    const unknown = dto.permissions.filter((c) => !known.has(c));
    if (unknown.length) {
      throw new BadRequestException(`Unknown permission code(s): ${unknown.join(', ')}`);
    }

    const rows = await this.prisma.permission.findMany({
      where: { code: { in: dto.permissions } },
      select: { id: true },
    });

    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { role_id: id } }),
      this.prisma.rolePermission.createMany({
        data: rows.map((p) => ({ role_id: id, permission_id: p.id })),
      }),
    ]);

    // Without this, the guard would keep serving the old grants until the TTL lapses.
    this.permissions.invalidate(id);

    return this.findOne(id);
  }
}
