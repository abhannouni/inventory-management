import { Injectable } from '@nestjs/common';
import type { ModuleStatus } from '../sell-out/sell-out.service';

/**
 * Marketing & trade marketing analysis has no data model yet. The endpoint
 * exists — and is permission-gated like every other module — so the page can
 * be reached, denied, and wired up ahead of the real feature.
 */
@Injectable()
export class MarketingService {
  status(): ModuleStatus {
    return {
      available: false,
      message: 'Marketing & trade marketing analysis is not yet integrated.',
    };
  }
}
