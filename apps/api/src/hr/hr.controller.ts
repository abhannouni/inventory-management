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
import { AttendanceService } from './attendance.service';
import {
  ClockPositionDto,
  CreateWorkLocationDto,
  SetAttendancePolicyDto,
  UpdateWorkLocationDto,
} from './dto/attendance.dto';
import { RangeQueryDto } from './dto/range-query.dto';
import { AssignSchedulesDto, SetRoleScheduleDto } from './dto/set-schedule.dto';
import { EmployeeFilterDto, TrackingQueryDto } from './dto/tracking-query.dto';
import {
  CreateWorkSessionDto,
  CreateWorkSessionsBulkDto,
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
    private readonly attendance: AttendanceService,
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
  clockIn(@CurrentUser() user: User, @Body() pos: ClockPositionDto) {
    return this.workHours.clockIn(user, pos);
  }

  @Post('me/clock-out')
  @ApiOperation({ summary: 'Stop recording working time' })
  clockOut(@CurrentUser() user: User, @Body() pos: ClockPositionDto) {
    return this.workHours.clockOut(user, pos);
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

  @Get('employees/:id/working-hours')
  @RequirePermissions('hr.read')
  @ApiOperation({
    summary:
      "Calculate one employee's working hours from their clocked time, location-checked against their policy, with their visits reported separately",
  })
  calculate(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: RangeQueryDto,
  ) {
    return this.attendance.calculate(id, query);
  }

  // ─── Attendance policies & work locations ────────────────────────────────

  @Get('employees/:id/attendance-policy')
  @RequirePermissions('hr.read')
  @ApiOperation({ summary: 'Where one employee may clock their working time' })
  getPolicy(@Param('id', ParseUUIDPipe) id: string) {
    return this.attendance.getPolicy(id);
  }

  @Put('employees/:id/attendance-policy')
  @RequirePermissions('hr.manage')
  @ApiOperation({ summary: "Set one employee's attendance location rules" })
  setPolicy(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetAttendancePolicyDto,
    @CurrentUser() actor: User,
  ) {
    return this.attendance.setPolicy(id, dto, actor);
  }

  @Get('work-locations')
  @RequirePermissions('hr.read')
  @ApiOperation({ summary: 'Agencies, offices and other fixed work locations' })
  locations() {
    return this.attendance.listLocations();
  }

  @Post('work-locations')
  @RequirePermissions('hr.manage')
  @ApiOperation({ summary: 'Add a work location' })
  createLocation(
    @Body() dto: CreateWorkLocationDto,
    @CurrentUser() actor: User,
  ) {
    return this.attendance.createLocation(dto, actor);
  }

  @Patch('work-locations/:id')
  @RequirePermissions('hr.manage')
  @ApiOperation({ summary: 'Edit a work location' })
  updateLocation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkLocationDto,
    @CurrentUser() actor: User,
  ) {
    return this.attendance.updateLocation(id, dto, actor);
  }

  @Delete('work-locations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('hr.manage')
  @ApiOperation({
    summary: 'Delete a work location (removes it from every policy)',
  })
  @ApiNoContentResponse()
  removeLocation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: User,
  ) {
    return this.attendance.removeLocation(id, actor);
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

  @Post('sessions/bulk')
  @RequirePermissions('hr.manage')
  @ApiOperation({
    summary:
      'Record the same working time for several employees (those it would overlap are skipped)',
  })
  createSessionsBulk(
    @Body() dto: CreateWorkSessionsBulkDto,
    @CurrentUser() actor: User,
  ) {
    return this.workHours.createSessionsBulk(dto, actor);
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
