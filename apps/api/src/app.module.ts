import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { UserModule } from './user/user.module';
import { RegionsModule } from './regions/regions.module';
import { StoresModule } from './stores/stores.module';
import { ProductsModule } from './products/products.module';
import { ProductStoreModule } from './product-store/product-store.module';
import { VisitsModule } from './visits/visits.module';
import { AuditItemsModule } from './audit-items/audit-items.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    UserModule,
    RegionsModule,
    StoresModule,
    ProductsModule,
    ProductStoreModule,
    VisitsModule,
    AuditItemsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
