import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ReportFiltersDto } from './dto/report-filters.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('visits')
  @ApiOperation({
    summary: 'Visit report with per-visit summary (scoped by role)',
    description:
      'super_admin → all | admin → their region | supervisor → assigned stores | merchandiser → own visits',
  })
  visitsReport(@Query() filters: ReportFiltersDto, @CurrentUser() user: User) {
    return this.reportsService.visitsReport(user, filters);
  }

  @Get('stores/:id')
  @ApiOperation({ summary: 'Full audit history for a store, grouped by visit' })
  storeReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() filters: ReportFiltersDto,
    @CurrentUser() user: User,
  ) {
    return this.reportsService.storeReport(id, user, filters);
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Product scan history across all visits (scoped by role)' })
  productReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() filters: ReportFiltersDto,
    @CurrentUser() user: User,
  ) {
    return this.reportsService.productReport(id, user, filters);
  }
}
