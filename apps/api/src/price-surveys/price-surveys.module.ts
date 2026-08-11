import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PriceSurveysController } from './price-surveys.controller';
import { PriceSurveysService } from './price-surveys.service';

@Module({
  imports: [AuthModule],
  controllers: [PriceSurveysController],
  providers: [PriceSurveysService],
})
export class PriceSurveysModule {}
