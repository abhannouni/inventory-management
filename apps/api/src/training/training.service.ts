import { Injectable } from '@nestjs/common';
import type { ModuleStatus } from '../common/module-status';

/**
 * Training has no data model yet. The endpoint exists so the page can be
 * reached and wired up ahead of the real feature. Available to every
 * authenticated role — no permission gate.
 */
@Injectable()
export class TrainingService {
  status(): ModuleStatus {
    return {
      available: false,
      message: 'Training content is not yet available.',
    };
  }
}
