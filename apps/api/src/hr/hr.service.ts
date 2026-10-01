import { Injectable } from '@nestjs/common';
import type { ModuleStatus } from '../common/module-status';

@Injectable()
export class HrService {
  status(): ModuleStatus {
    return {
      available: true,
      message: 'Working hours: schedules and time tracking.',
    };
  }
}
