import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { ReportFiltersDto } from './dto/report-filters.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('visits')
  @RequirePermissions('reports.read')
  @ApiOperation({
    summary: 'Visit report with per-visit summary (scoped by role)',
    description:
      'super_admin → all | admin → their region | supervisor → assigned stores | merchandiser → own visits',
  })
  visitsReport(@Query() filters: ReportFiltersDto, @CurrentUser() user: User) {
    return this.reportsService.visitsReport(user, filters);
  }

  @Get('stores/:id')
  @RequirePermissions('reports.read')
  @ApiOperation({ summary: 'Full audit history for a store, grouped by visit' })
  storeReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() filters: ReportFiltersDto,
    @CurrentUser() user: User,
  ) {
    return this.reportsService.storeReport(id, user, filters);
  }

  @Get('products/:id')
  @RequirePermissions('reports.read')
  @ApiOperation({ summary: 'Product scan history across all visits (scoped by role)' })
  productReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() filters: ReportFiltersDto,
    @CurrentUser() user: User,
  ) {
    return this.reportsService.productReport(id, user, filters);
  }
}
