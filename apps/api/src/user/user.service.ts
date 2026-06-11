import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AssignStoresDto } from './dto/assign-stores.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from '@prisma/client';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.user.findMany({ include: { region: true } });
    return users.map(this.sanitize);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        region: true,
        userStores: { include: { store: { include: { region: true } } } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    const { userStores, ...rest } = user;
    return { ...this.sanitize(rest as User), stores: userStores.map((us) => us.store) };
  }

  async create(dto: CreateUserDto) {
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

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.email && dto.email !== user.email) {
      const conflict = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (conflict) throw new ConflictException('Email already in use');
    }

    const data: Record<string, unknown> = {};
    if (dto.full_name !== undefined) data.full_name = dto.full_name;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.role !== undefined) data.role = dto.role;
    if (dto.region_id !== undefined) data.region_id = dto.region_id ?? null;
    if (dto.password) data.password = await bcrypt.hash(dto.password, 12);

    const updated = await this.prisma.user.update({ where: { id }, data });
    return this.sanitize(updated);
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
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

  private sanitize<T extends User>(user: T) {
    const { password: _, ...rest } = user;
    return rest;
  }
}
