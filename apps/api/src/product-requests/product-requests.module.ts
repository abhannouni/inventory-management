import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ProductRequestsController } from './product-requests.controller';
import { ProductRequestsService } from './product-requests.service';

@Module({
  imports: [AuthModule],
  controllers: [ProductRequestsController],
  providers: [ProductRequestsService],
})
export class ProductRequestsModule {}
