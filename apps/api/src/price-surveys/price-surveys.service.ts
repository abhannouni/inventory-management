import { Injectable } from '@nestjs/common';
import type { ModuleStatus } from '../common/module-status';

/**
 * Price Surveys (Relevés de prix) has no data model yet. The endpoint exists
 * so the page can be reached and wired up ahead of the real feature.
 * Available to every authenticated role — no permission gate.
 */
@Injectable()
export class PriceSurveysService {
  status(): ModuleStatus {
    return {
      available: false,
      message: 'Price surveys are not yet available.',
    };
  }
}
