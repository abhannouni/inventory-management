import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { MarketingService } from './marketing.service';

@ApiTags('marketing')
@ApiBearerAuth()
@Controller('marketing')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MarketingController {
  constructor(private readonly marketingService: MarketingService) {}

  @Get()
  @RequirePermissions('marketing.read')
  @ApiOperation({ summary: 'Marketing & trade marketing module status (feature pending — see message)' })
  status() {
    return this.marketingService.status();
  }
}
