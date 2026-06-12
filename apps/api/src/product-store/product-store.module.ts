import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProductStoreController } from './product-store.controller';
import { ProductStoreService } from './product-store.service';

@Module({
  imports: [AuthModule],
  controllers: [ProductStoreController],
  providers: [ProductStoreService],
  exports: [ProductStoreService],
})
export class ProductStoreModule {}
