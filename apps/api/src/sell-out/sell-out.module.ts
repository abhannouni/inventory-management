import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SellOutController } from './sell-out.controller';
import { SellOutService } from './sell-out.service';

@Module({
  imports: [AuthModule],
  controllers: [SellOutController],
  providers: [SellOutService],
})
export class SellOutModule {}
