import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { MerchandisingService } from './merchandising.service';

@ApiTags('merchandising')
@ApiBearerAuth()
@Controller('merchandising')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MerchandisingController {
  constructor(private readonly merchandisingService: MerchandisingService) {}

  @Get()
  @RequirePermissions('merchandising.read')
  @ApiOperation({ summary: 'Merchandising module status (feature pending — see message)' })
  status() {
    return this.merchandisingService.status();
  }
}
