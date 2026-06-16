import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly client: PrismaClient;

  readonly user: PrismaClient['user'];
  readonly store: PrismaClient['store'];
  readonly region: PrismaClient['region'];
  readonly userStore: PrismaClient['userStore'];
  readonly product: PrismaClient['product'];
  readonly productStore: PrismaClient['productStore'];
  readonly visit: PrismaClient['visit'];
  readonly auditItem: PrismaClient['auditItem'];
  readonly schedule: PrismaClient['schedule'];

  constructor(config: ConfigService) {
    const adapter = new PrismaPg(config.get<string>('DATABASE_URL')!);
    this.client = new PrismaClient({ adapter });

    this.user = this.client.user;
    this.store = this.client.store;
    this.region = this.client.region;
    this.userStore = this.client.userStore;
    this.product = this.client.product;
    this.productStore = this.client.productStore;
    this.visit = this.client.visit;
    this.auditItem = this.client.auditItem;
    this.schedule = this.client.schedule;
  }

  $transaction: PrismaClient['$transaction'] = (...args: any[]) =>
    (this.client.$transaction as any)(...args);

  async onModuleInit() {
    await this.client.$connect();
  }

  async onModuleDestroy() {
    await this.client.$disconnect();
  }
}
