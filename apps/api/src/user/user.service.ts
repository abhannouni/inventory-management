import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, User, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import {
  PaginatedResult,
  paginated,
  safeOrderBy,
  toSkipTake,
} from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AssignStoresDto } from './dto/assign-stores.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersDto, USER_SORT_FIELDS } from './dto/list-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: ListUsersDto): Promise<PaginatedResult<Omit<User, 'password'>>> {
    const where: Prisma.UserWhereInput = {};

    if (query.search) {
      where.OR = [
        { full_name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.role) where.role = query.role;
    if (query.region_id) where.region_id = query.region_id;
    if (query.role_id) where.role_id = query.role_id;
    if (query.supervisor_id) where.supervisor_id = query.supervisor_id;
    if (query.is_active !== undefined) where.is_active = query.is_active;

    const orderBy = safeOrderBy(query.sort_by, query.sort_dir, USER_SORT_FIELDS, {
      created_at: 'desc',
    });

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy,
        ...toSkipTake(query),
        include: {
          region: true,
          custom_role: true,
          supervisor: { select: { id: true, full_name: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return paginated(
      items.map((u) => this.sanitize(u)),
      total,
      query.page,
      query.limit,
    );
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        region: true,
        custom_role: true,
        supervisor: { select: { id: true, full_name: true } },
        userStores: { include: { store: { include: { region: true } } } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    const { userStores, ...rest } = user;
    return { ...this.sanitize(rest), stores: userStores.map((us) => us.store) };
  }

  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already in use');

    const { role, role_id } = await this.resolveRole(dto.role, dto.role_id);
    if (dto.supervisor_id) await this.assertValidSupervisor(dto.supervisor_id);
    const hashed = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        full_name: dto.full_name,
        email: dto.email,
        password: hashed,
        role,
        role_id,
        region_id: dto.region_id ?? null,
        supervisor_id: dto.supervisor_id ?? null,
        is_active: dto.is_active ?? true,
      },
      include: { region: true, custom_role: true },
    });
    return this.sanitize(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.email && dto.email !== user.email) {
      const conflict = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (conflict) throw new ConflictException('Email already in use');
    }

    const data: Prisma.UserUpdateInput = {};
    if (dto.full_name !== undefined) data.full_name = dto.full_name;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.region_id !== undefined) {
      data.region = dto.region_id
        ? { connect: { id: dto.region_id } }
        : { disconnect: true };
    }
    if (dto.password) data.password = await bcrypt.hash(dto.password, 12);

    if (dto.supervisor_id !== undefined) {
      if (dto.supervisor_id === null) {
        data.supervisor = { disconnect: true };
      } else {
        if (dto.supervisor_id === id) {
          throw new BadRequestException('A user cannot be their own supervisor');
        }
        await this.assertValidSupervisor(dto.supervisor_id);
        data.supervisor = { connect: { id: dto.supervisor_id } };
      }
    }

    if (dto.role !== undefined || dto.role_id !== undefined) {
      const resolved = await this.resolveRole(dto.role ?? user.role, dto.role_id);

      // Demoting the last super admin would leave the platform unadministrable.
      if (user.role === UserRole.super_admin && resolved.role !== UserRole.super_admin) {
        await this.assertNotLastSuperAdmin(id, 'demote');
      }

      data.role = resolved.role;
      data.custom_role = resolved.role_id
        ? { connect: { id: resolved.role_id } }
        : { disconnect: true };
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      include: { region: true, custom_role: true },
    });
    return this.sanitize(updated);
  }

  /**
   * Soft state change — the user keeps all their history. `JwtStrategy` rejects
   * inactive users on every request, so deactivating also cuts off live sessions.
   */
  async setActive(id: string, isActive: boolean, actorId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: { region: true, custom_role: true },
    });
    if (!user) throw new NotFoundException('User not found');

    if (!isActive) {
      if (id === actorId) {
        throw new BadRequestException('You cannot deactivate your own account');
      }
      if (user.role === UserRole.super_admin) {
        await this.assertNotLastSuperAdmin(id, 'deactivate');
      }
    }

    if (user.is_active === isActive) return this.sanitize(user);

    const updated = await this.prisma.user.update({
      where: { id },
      data: { is_active: isActive, deactivated_at: isActive ? null : new Date() },
      include: { region: true, custom_role: true },
    });
    return this.sanitize(updated);
  }

  async remove(id: string, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (id === actorId) {
      throw new BadRequestException('You cannot delete your own account');
    }
    if (user.role === UserRole.super_admin) {
      await this.assertNotLastSuperAdmin(id, 'delete');
    }

    await this.prisma.user.delete({ where: { id } });
  }

  async assignStores(id: string, dto: AssignStoresDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const stores = await this.prisma.store.findMany({
      where: { id: { in: dto.store_ids } },
    });
    if (stores.length !== dto.store_ids.length) {
      throw new NotFoundException('One or more store IDs not found');
    }

    await this.prisma.$transaction([
      this.prisma.userStore.deleteMany({ where: { user_id: id } }),
      this.prisma.userStore.createMany({
        data: dto.store_ids.map((store_id) => ({ user_id: id, store_id })),
      }),
    ]);

    return { user_id: id, stores };
  }

  /**
   * Keeps `role` (legacy enum) and `role_id` (RBAC row) consistent.
   * An explicit `role_id` wins; for a custom role the enum falls back to the
   * least-privileged value, so the legacy RolesGuard can never over-grant.
   */
  private async resolveRole(
    role: UserRole,
    roleId?: string,
  ): Promise<{ role: UserRole; role_id: string | null }> {
    if (roleId) {
      const found = await this.prisma.role.findUnique({ where: { id: roleId } });
      if (!found) throw new NotFoundException('Role not found');

      const isBuiltIn = (Object.values(UserRole) as string[]).includes(found.name);
      return {
        role: isBuiltIn ? (found.name as UserRole) : UserRole.merchandiser,
        role_id: found.id,
      };
    }

    const found = await this.prisma.role.findUnique({ where: { name: role } });
    return { role, role_id: found?.id ?? null };
  }

  /** The supervisor_id on a user must point to an actual supervisor, so schedule scoping stays meaningful. */
  private async assertValidSupervisor(supervisorId: string) {
    const supervisor = await this.prisma.user.findUnique({ where: { id: supervisorId } });
    if (!supervisor) throw new NotFoundException('Supervisor not found');
    if (supervisor.role !== UserRole.supervisor) {
      throw new BadRequestException('supervisor_id must reference a user with the supervisor role');
    }
  }

  private async assertNotLastSuperAdmin(id: string, action: string) {
    const others = await this.prisma.user.count({
      where: { role: UserRole.super_admin, is_active: true, id: { not: id } },
    });
    if (others === 0) {
      throw new BadRequestException(`Cannot ${action} the last active super administrator`);
    }
  }

  private sanitize<T extends { password: string }>(user: T): Omit<T, 'password'> {
    const { password: _, ...rest } = user;
    return rest;
  }
}
