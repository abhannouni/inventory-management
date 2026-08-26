import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SettingsModule } from '../settings/settings.module';
import { VisitPlansController } from './plans/visit-plans.controller';
import { VisitPlansCron } from './plans/visit-plans.cron';
import { VisitPlansService } from './plans/visit-plans.service';
import { VisitsController } from './visits.controller';
import { VisitsService } from './visits.service';

@Module({
  imports: [AuthModule, NotificationsModule, SettingsModule],
  // VisitPlansController first: its `/visits/plans/…` routes must be matched
  // before VisitsController's `/visits/:id`.
  controllers: [VisitPlansController, VisitsController],
  providers: [VisitsService, VisitPlansService, VisitPlansCron],
  exports: [VisitsService],
})
export class VisitsModule {}
