import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CheckinDto } from './dto/checkin.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { FindVisitsDto } from './dto/find-visits.dto';
import { SubmitVisitReportDto } from './dto/submit-visit-report.dto';
import { SubmitVisitStateDto } from './dto/submit-visit-state.dto';
import { VisitsService } from './visits.service';

@ApiTags('visits')
@ApiBearerAuth()
@Controller('visits')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  @Post('checkin')
  @RequirePermissions('visits.create')
  @ApiOperation({ summary: 'Check in to a store — validates GPS proximity (< 200 m)' })
  checkin(@Body() dto: CheckinDto, @CurrentUser() user: User) {
    return this.visitsService.checkin(dto, user);
  }

  @Post('checkout')
  @RequirePermissions('visits.update')
  @ApiOperation({ summary: 'Check out of a visit — closes it and records GPS' })
  checkout(@Body() dto: CheckoutDto, @CurrentUser() user: User) {
    return this.visitsService.checkout(dto, user);
  }

  @Patch(':id/report')
  @RequirePermissions('visits.update')
  @ApiOperation({ summary: "Save a supervisor's spot-check report (title, note, photos) on an open visit" })
  submitReport(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitVisitReportDto,
    @CurrentUser() user: User,
  ) {
    return this.visitsService.submitReport(id, dto, user);
  }

  @Patch(':id/initial-state')
  @RequirePermissions('visits.update')
  @ApiOperation({ summary: "Save the merchandiser's before-audit shelf photo(s) and note on an open visit" })
  submitInitialState(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitVisitStateDto,
    @CurrentUser() user: User,
  ) {
    return this.visitsService.submitInitialState(id, dto, user);
  }

  @Patch(':id/final-state')
  @RequirePermissions('visits.update')
  @ApiOperation({ summary: "Save the merchandiser's after-audit shelf photo(s) and note on an open visit" })
  submitFinalState(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SubmitVisitStateDto,
    @CurrentUser() user: User,
  ) {
    return this.visitsService.submitFinalState(id, dto, user);
  }

  @Get('active')
  @RequirePermissions('visits.read')
  @ApiOperation({
    summary:
      'The caller’s currently open visit, or null — lets the client resume the timer after a refresh or on another device',
  })
  findActive(@CurrentUser() user: User) {
    return this.visitsService.findActive(user);
  }

  @Get()
  @RequirePermissions('visits.read')
  @ApiOperation({ summary: 'List visits (scoped by role, filterable by store/status)' })
  findAll(@Query() query: FindVisitsDto, @CurrentUser() user: User) {
    return this.visitsService.findAll(user, query);
  }

  @Get(':id')
  @RequirePermissions('visits.read')
  @ApiOperation({ summary: 'Get a visit with all its audit items' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.visitsService.findOne(id, user);
  }
}
