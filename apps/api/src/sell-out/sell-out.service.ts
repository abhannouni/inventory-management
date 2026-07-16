import { Injectable } from '@nestjs/common';

export interface ModuleStatus {
  available: boolean;
  message: string;
}

/**
 * Sell-out (point-of-sale consumer purchase data) has no data model yet.
 * The endpoint exists — and is permission-gated like every other module — so
 * the page can be reached, denied, and wired up ahead of the real feature.
 */
@Injectable()
export class SellOutService {
  status(): ModuleStatus {
    return {
      available: false,
      message: 'Sell-out tracking is not yet integrated. This module will populate once sell-out data is connected.',
    };
  }
}
