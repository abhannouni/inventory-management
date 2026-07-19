import { Injectable } from '@nestjs/common';
import type { ModuleStatus } from '../common/module-status';

/**
 * HR has no data model yet. The endpoint exists — and is permission-gated
 * like every other module — so the page can be reached, denied, and wired
 * up ahead of the real feature.
 */
@Injectable()
export class HrService {
  status(): ModuleStatus {
    return {
      available: false,
      message: 'HR is not yet integrated.',
    };
  }
}
