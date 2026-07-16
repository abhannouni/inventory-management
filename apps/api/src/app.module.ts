import { join } from 'path';
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
import { MerchandisingModule } from './merchandising/merchandising.module';
import { MarketingModule } from './marketing/marketing.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', '..', 'web', 'dist'),
      exclude: ['/api{/*splat}', '/docs', '/docs-json', '/docs-yaml', '/docs{/*splat}'],
    }),
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
    MerchandisingModule,
    MarketingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
