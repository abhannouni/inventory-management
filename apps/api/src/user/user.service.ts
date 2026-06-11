import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { In, Repository } from 'typeorm';
import { Store } from '../store/entities/store.entity';
import { UserStore } from '../user-store/entities/user-store.entity';
import { AssignStoresDto } from './dto/assign-stores.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Store) private readonly stores: Repository<Store>,
    @InjectRepository(UserStore) private readonly userStores: Repository<UserStore>,
  ) {}

  async findAll() {
    const users = await this.users.find({ relations: ['region'] });
    return users.map(this.sanitize);
  }

  async findOne(id: string) {
    const user = await this.users.findOne({
      where: { id },
      relations: ['region'],
    });
    if (!user) throw new NotFoundException('User not found');

    const assignments = await this.userStores.find({
      where: { user: { id } },
      relations: ['store', 'store.region'],
    });

    return { ...this.sanitize(user), stores: assignments.map((a) => a.store) };
  }

  async create(dto: CreateUserDto) {
    const exists = await this.users.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already in use');

    const hashed = await bcrypt.hash(dto.password, 12);
    const user = this.users.create({
      full_name: dto.full_name,
      email: dto.email,
      password: hashed,
      role: dto.role,
      region: dto.region_id ? ({ id: dto.region_id } as any) : undefined,
    });
    await this.users.save(user);
    return this.sanitize(user);
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.email && dto.email !== user.email) {
      const conflict = await this.users.findOne({ where: { email: dto.email } });
      if (conflict) throw new ConflictException('Email already in use');
    }

    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 12);
    }

    const { region_id, ...fields } = dto;
    Object.assign(user, fields);
    if (region_id !== undefined) {
      user.region = region_id ? ({ id: region_id } as any) : null;
    }

    await this.users.save(user);
    return this.sanitize(user);
  }

  async remove(id: string) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    await this.users.remove(user);
  }

  async assignStores(id: string, dto: AssignStoresDto) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const foundStores = await this.stores.findBy({ id: In(dto.store_ids) });
    if (foundStores.length !== dto.store_ids.length) {
      throw new NotFoundException('One or more store IDs not found');
    }

    // Replace all existing assignments for this user
    await this.userStores.delete({ user: { id } });
    const assignments = foundStores.map((store) =>
      this.userStores.create({ user, store }),
    );
    await this.userStores.save(assignments);

    return { user_id: id, stores: foundStores };
  }

  private sanitize(user: User) {
    const { password: _, ...rest } = user;
    return rest;
  }
}
