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
  readonly role: PrismaClient['role'];
  readonly permission: PrismaClient['permission'];
  readonly rolePermission: PrismaClient['rolePermission'];
  readonly clientAccount: PrismaClient['client'];
  readonly plan: PrismaClient['plan'];
  readonly subscription: PrismaClient['subscription'];
  readonly kpi: PrismaClient['kpi'];
  readonly dashboard: PrismaClient['dashboard'];
  readonly dashboardWidget: PrismaClient['dashboardWidget'];
  readonly adminAuditLog: PrismaClient['adminAuditLog'];
  readonly refreshToken: PrismaClient['refreshToken'];
  readonly sellOut: PrismaClient['sellOut'];
  readonly featureFlag: PrismaClient['featureFlag'];
  readonly productRequest: PrismaClient['productRequest'];
  readonly visitReportCard: PrismaClient['visitReportCard'];
  readonly promo: PrismaClient['promo'];
  readonly promoItem: PrismaClient['promoItem'];
  readonly promoItemPicture: PrismaClient['promoItemPicture'];
  readonly notification: PrismaClient['notification'];
  readonly priceSurveyAssignment: PrismaClient['priceSurveyAssignment'];
  readonly priceSurveySubmission: PrismaClient['priceSurveySubmission'];
  readonly priceSurveyItem: PrismaClient['priceSurveyItem'];
  readonly priceSurveyNote: PrismaClient['priceSurveyNote'];
  readonly visitPlan: PrismaClient['visitPlan'];

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
    this.role = this.client.role;
    this.permission = this.client.permission;
    this.rolePermission = this.client.rolePermission;
    // Exposed as `clientAccount`: `client` is already taken by the PrismaClient instance above.
    this.clientAccount = this.client.client;
    this.plan = this.client.plan;
    this.subscription = this.client.subscription;
    this.kpi = this.client.kpi;
    this.dashboard = this.client.dashboard;
    this.dashboardWidget = this.client.dashboardWidget;
    this.adminAuditLog = this.client.adminAuditLog;
    this.refreshToken = this.client.refreshToken;
    this.sellOut = this.client.sellOut;
    this.featureFlag = this.client.featureFlag;
    this.productRequest = this.client.productRequest;
    this.visitReportCard = this.client.visitReportCard;
    this.promo = this.client.promo;
    this.promoItem = this.client.promoItem;
    this.promoItemPicture = this.client.promoItemPicture;
    this.notification = this.client.notification;
    this.priceSurveyAssignment = this.client.priceSurveyAssignment;
    this.priceSurveySubmission = this.client.priceSurveySubmission;
    this.priceSurveyItem = this.client.priceSurveyItem;
    this.priceSurveyNote = this.client.priceSurveyNote;
    this.visitPlan = this.client.visitPlan;
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
