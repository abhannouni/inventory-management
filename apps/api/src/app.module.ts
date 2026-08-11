import { join, resolve } from 'path';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { RolesModule } from './roles/roles.module';
import { RegionsModule } from './regions/regions.module';
import { StoresModule } from './stores/stores.module';
import { ProductsModule } from './products/products.module';
import { ProductStoreModule } from './product-store/product-store.module';
import { VisitsModule } from './visits/visits.module';
import { AuditItemsModule } from './audit-items/audit-items.module';
import { UploadModule } from './upload/upload.module';
import { ReportsModule } from './reports/reports.module';
import { SchedulesModule } from './schedules/schedules.module';
import { SellOutModule } from './sell-out/sell-out.module';
import { TrainingModule } from './training/training.module';
import { SettingsModule } from './settings/settings.module';
import { HrModule } from './hr/hr.module';
import { ProductRequestsModule } from './product-requests/product-requests.module';
import { PromosModule } from './promos/promos.module';
import { PriceSurveysModule } from './price-surveys/price-surveys.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ServeStaticModule.forRoot(
      {
        rootPath: join(__dirname, '..', '..', '..', 'web', 'dist'),
        exclude: ['/api{/*splat}', '/docs', '/docs-json', '/docs-yaml', '/docs{/*splat}', '/uploads{/*splat}'],
      },
      {
        // Serves whatever UploadService writes to — point UPLOAD_DIR at a
        // mounted persistent volume in production (plain container disk is
        // wiped on every deploy).
        rootPath: resolve(process.env.UPLOAD_DIR || './uploads'),
        serveRoot: '/uploads',
      },
    ),
    PrismaModule,
    AuthModule,
    UserModule,
    RolesModule,
    RegionsModule,
    StoresModule,
    ProductsModule,
    ProductStoreModule,
    VisitsModule,
    AuditItemsModule,
    UploadModule,
    ReportsModule,
    SchedulesModule,
    SellOutModule,
    TrainingModule,
    SettingsModule,
    HrModule,
    ProductRequestsModule,
    PromosModule,
    PriceSurveysModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
