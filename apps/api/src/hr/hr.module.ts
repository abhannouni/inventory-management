import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SettingsModule } from '../settings/settings.module';
import { AttendanceService } from './attendance.service';
import { HrController } from './hr.controller';
import { HrService } from './hr.service';
import { WorkHoursService } from './work-hours.service';

@Module({
  imports: [AuthModule, SettingsModule],
  controllers: [HrController],
  providers: [HrService, WorkHoursService, AttendanceService],
})
export class HrModule {}
