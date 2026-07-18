import { Injectable } from '@nestjs/common';
import type { ModuleStatus } from '../common/module-status';

/**
 * Merchandising execution (displays, TG, MEA, PLV placements) has no data
 * model yet. The endpoint exists — and is permission-gated like every other
 * module — so the page can be reached, denied, and wired up ahead of the real
 * feature.
 */
@Injectable()
export class MerchandisingService {
  status(): ModuleStatus {
    return {
      available: false,
      message: 'Merchandising execution tracking (displays, TG, MEA, PLV) is not yet integrated.',
    };
  }
}
