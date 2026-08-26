import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RequireAnyPermission } from '../../auth/decorators/require-any-permission.decorator';
import { RequirePermissions } from '../../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { AddPlannedVisitsDto } from './dto/add-visits.dto';
import { FindAllPlannedDto } from './dto/find-all-planned.dto';
import { FindVisitPlansDto } from './dto/find-plans.dto';
import { GetVisitPlanDto } from './dto/get-plan.dto';
import { PlanVisitDto } from './dto/plan-visit.dto';
import { ReviewVisitPlanDto } from './dto/review-plan.dto';
import { SetMonthPlanDto } from './dto/set-month.dto';
import { UpdatePlannedVisitDto } from './dto/update-planned-visit.dto';
import { VisitPlansService } from './visit-plans.service';

/**
 * Registered ahead of `VisitsController` in the module so `/visits/plans/…`
 * always wins over that controller's `/visits/:id`.
 */
@ApiTags('visit-plans')
@ApiBearerAuth()
@Controller('visits/plans')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VisitPlansController {
  constructor(private readonly service: VisitPlansService) {}

  @Get('mine')
  @RequirePermissions('visit_plans.read')
  @ApiOperation({ summary: "The caller's own month of planned visits — read-only for a merchandiser" })
  getMine(@Query() query: GetVisitPlanDto, @CurrentUser() user: User) {
    return this.service.getMine(user, query.year, query.month);
  }

  @Get('mine/upcoming')
  @RequirePermissions('visit_plans.read')
  @ApiOperation({ summary: "The caller's planned visits from today forward — what the check-in screen offers" })
  upcoming(@CurrentUser() user: User) {
    return this.service.upcoming(user);
  }

  @Post('mine')
  @RequirePermissions('visit_plans.create')
  @ApiOperation({ summary: 'Plan a visit on a day of your own month — creates the draft on first write' })
  planVisit(@Body() dto: PlanVisitDto, @CurrentUser() user: User) {
    return this.service.planVisit(user, dto);
  }

  @Post('mine/submit')
  @RequirePermissions('visit_plans.update')
  @ApiOperation({ summary: 'Submit your draft (or fixed-up declined) month for review' })
  submit(@Body() dto: GetVisitPlanDto, @CurrentUser() user: User) {
    return this.service.submit(user, dto.year, dto.month);
  }

  @Patch('mine/:visitId')
  @RequirePermissions('visit_plans.update')
  @ApiOperation({ summary: 'Move or re-note a planned visit on your own month' })
  updatePlannedVisit(
    @Param('visitId', ParseUUIDPipe) visitId: string,
    @Body() dto: UpdatePlannedVisitDto,
    @CurrentUser() user: User,
  ) {
    return this.service.updatePlannedVisit(visitId, dto, user);
  }

  @Delete('mine/:visitId')
  @RequirePermissions('visit_plans.delete')
  @ApiOperation({ summary: 'Drop a planned visit from your own month' })
  removePlannedVisit(@Param('visitId', ParseUUIDPipe) visitId: string, @CurrentUser() user: User) {
    return this.service.removePlannedVisit(visitId, user);
  }

  @Get()
  @RequireAnyPermission('visit_plans.review', 'visit_plans.read')
  @ApiOperation({ summary: 'List months (filterable) plus who has no plan for the selected month' })
  findAll(@Query() query: FindVisitPlansDto) {
    return this.service.findAll(query);
  }

  @Get('all')
  @RequirePermissions('visit_plans.review')
  @ApiOperation({ summary: "Every planned visit in a month across the filtered people — the reviewer's calendar" })
  findAllPlanned(@Query() query: FindAllPlannedDto) {
    return this.service.findAllPlanned(query);
  }

  @Post('user/:userId/visits')
  @RequirePermissions('visit_plans.review')
  @ApiOperation({ summary: "Add planned visits to someone's month — approved on the spot" })
  addVisitsForUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: AddPlannedVisitsDto,
    @CurrentUser() user: User,
  ) {
    return this.service.addVisitsForUser(userId, dto, user);
  }

  @Get('user/:userId')
  @RequirePermissions('visit_plans.review')
  @ApiOperation({ summary: "Open one person's month — returns a null plan when nothing is planned yet" })
  findForUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() query: GetVisitPlanDto,
  ) {
    return this.service.findForUser(userId, query.year, query.month);
  }

  @Put('user/:userId')
  @RequirePermissions('visit_plans.review')
  @ApiOperation({
    summary: "Write someone's whole month and approve it — adjusts a supervisor's, or fills a merchandiser's from scratch",
  })
  setMonth(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: SetMonthPlanDto,
    @CurrentUser() user: User,
  ) {
    return this.service.setMonth(userId, dto, user);
  }

  @Get(':id')
  @RequireAnyPermission('visit_plans.review', 'visit_plans.read', 'visit_plans.update')
  @ApiOperation({ summary: 'One month with its planned visits — owner or a reviewer' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.service.findOne(id, user);
  }

  @Post(':id/review')
  @RequirePermissions('visit_plans.review')
  @ApiOperation({ summary: 'Approve or decline a month pending review (decline note optional)' })
  review(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewVisitPlanDto,
    @CurrentUser() user: User,
  ) {
    return this.service.review(id, dto, user);
  }
}
