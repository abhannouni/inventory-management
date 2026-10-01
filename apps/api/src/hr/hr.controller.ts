import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RangeQueryDto } from './dto/range-query.dto';
import { AssignSchedulesDto, SetRoleScheduleDto } from './dto/set-schedule.dto';
import { EmployeeFilterDto, TrackingQueryDto } from './dto/tracking-query.dto';
import {
  CreateWorkSessionDto,
  UpdateWorkSessionDto,
} from './dto/work-session.dto';
import { HrService } from './hr.service';
import { WorkHoursService } from './work-hours.service';

// `/hr/me/*` has no permission gate: every authenticated user clocks their own
// time, scoped to themselves in the service. Viewing the tracking is `hr.read`;
// changing schedules or time records is `hr.manage`.
@ApiTags('hr')
@ApiBearerAuth()
@Controller('hr')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class HrController {
  constructor(
    private readonly hrService: HrService,
    private readonly workHours: WorkHoursService,
  ) {}

  @Get()
  @RequirePermissions('hr.read')
  @ApiOperation({ summary: 'HR module status' })
  status() {
    return this.hrService.status();
  }

  // ─── Own time clock ──────────────────────────────────────────────────────

  @Get('me/today')
  @ApiOperation({
    summary: "The caller's schedule and recorded time for today",
  })
  myToday(@CurrentUser() user: User) {
    return this.workHours.myToday(user);
  }

  @Post('me/clock-in')
  @ApiOperation({
    summary: 'Start recording working time (idempotent while clocked in)',
  })
  clockIn(@CurrentUser() user: User) {
    return this.workHours.clockIn(user);
  }

  @Post('me/clock-out')
  @ApiOperation({ summary: 'Stop recording working time' })
  clockOut(@CurrentUser() user: User) {
    return this.workHours.clockOut(user);
  }

  // ─── Tracking ────────────────────────────────────────────────────────────

  @Get('filters')
  @RequirePermissions('hr.read')
  @ApiOperation({
    summary: 'Roles, regions and supervisors to filter employees by',
  })
  filters() {
    return this.workHours.filters();
  }

  @Get('tracking')
  @RequirePermissions('hr.read')
  @ApiOperation({
    summary: 'Assigned vs worked hours of every employee for one day',
  })
  tracking(@Query() query: TrackingQueryDto) {
    return this.workHours.tracking(query);
  }

  @Get('employees')
  @RequirePermissions('hr.read')
  @ApiOperation({
    summary: 'All matching employees with their current schedule (unpaginated)',
  })
  employees(@Query() query: EmployeeFilterDto) {
    return this.workHours.listEmployees(query);
  }

  @Get('employees/:id')
  @RequirePermissions('hr.read')
  @ApiOperation({
    summary: "One employee's days, time records and schedule history",
  })
  employee(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: RangeQueryDto,
  ) {
    return this.workHours.employeeDetail(id, query);
  }

  // ─── Schedules ───────────────────────────────────────────────────────────

  @Get('role-schedules')
  @RequirePermissions('hr.read')
  @ApiOperation({ summary: 'Default working hours of every role' })
  roleSchedules() {
    return this.workHours.listRoleSchedules();
  }

  @Put('role-schedules/:roleId')
  @RequirePermissions('hr.manage')
  @ApiOperation({
    summary: "Set (or remove, with days: null) a role's default working hours",
  })
  setRoleSchedule(
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @Body() dto: SetRoleScheduleDto,
    @CurrentUser() actor: User,
  ) {
    return this.workHours.setRoleSchedule(roleId, dto, actor);
  }

  @Post('schedules/assign')
  @RequirePermissions('hr.manage')
  @ApiOperation({
    summary: 'Assign working hours to one or many employees (all-or-nothing)',
  })
  assign(@Body() dto: AssignSchedulesDto, @CurrentUser() actor: User) {
    return this.workHours.assignSchedules(dto, actor);
  }

  // ─── Time records ────────────────────────────────────────────────────────

  @Post('sessions')
  @RequirePermissions('hr.manage')
  @ApiOperation({ summary: 'Record working time on behalf of an employee' })
  createSession(@Body() dto: CreateWorkSessionDto, @CurrentUser() actor: User) {
    return this.workHours.createSession(dto, actor);
  }

  @Patch('sessions/:id')
  @RequirePermissions('hr.manage')
  @ApiOperation({ summary: 'Correct a time record' })
  updateSession(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkSessionDto,
    @CurrentUser() actor: User,
  ) {
    return this.workHours.updateSession(id, dto, actor);
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('hr.manage')
  @ApiOperation({ summary: 'Delete a time record' })
  @ApiNoContentResponse()
  removeSession(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: User,
  ) {
    return this.workHours.removeSession(id, actor);
  }
}
