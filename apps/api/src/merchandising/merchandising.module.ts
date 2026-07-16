import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { MerchandisingController } from './merchandising.controller';
import { MerchandisingService } from './merchandising.service';

@Module({
  imports: [AuthModule],
  controllers: [MerchandisingController],
  providers: [MerchandisingService],
})
export class MerchandisingModule {}
