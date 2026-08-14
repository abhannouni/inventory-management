import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PriceSurveysController } from './price-surveys.controller';
import { PriceSurveysService } from './price-surveys.service';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [PriceSurveysController],
  providers: [PriceSurveysService],
})
export class PriceSurveysModule {}
