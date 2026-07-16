import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { SellOutService } from './sell-out.service';

@ApiTags('sell-out')
@ApiBearerAuth()
@Controller('sell-out')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SellOutController {
  constructor(private readonly sellOutService: SellOutService) {}

  @Get()
  @RequirePermissions('sell_out.read')
  @ApiOperation({ summary: 'Sell-out module status (feature pending — see message)' })
  status() {
    return this.sellOutService.status();
  }
}
