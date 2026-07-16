import {
  Body,
  Controller,
  Delete,
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
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { FindSchedulesDto } from './dto/find-schedules.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { SchedulesService } from './schedules.service';

@ApiTags('schedules')
@ApiBearerAuth()
@Controller('schedules')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post()
  @RequirePermissions('schedules.create')
  @ApiOperation({ summary: 'Create a schedule entry (requires schedules.create)' })
  create(@Body() dto: CreateScheduleDto, @CurrentUser() user: User) {
    return this.schedulesService.create(dto, user);
  }

  @Get()
  @RequirePermissions('schedules.read')
  @ApiOperation({ summary: 'List schedules scoped by role, filterable by month/status/user' })
  findAll(@Query() query: FindSchedulesDto, @CurrentUser() user: User) {
    return this.schedulesService.findAll(user, query);
  }

  // Deliberately not permission-gated at the endpoint level: a schedule owner
  // with only `schedules.read` may still mark their own entry completed (a
  // self-service action, not a management one), while everyone else's edit
  // rights are decided by row-level scope inside the service. Gating this route
  // on `schedules.update` would block that legitimate self-service case, since
  // owning a record isn't itself a permission. See SchedulesService.update().
  @Patch(':id')
  @ApiOperation({
    summary:
      'Update a schedule — full edit if scoped/permitted, or self-mark-complete for the owner',
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateScheduleDto,
    @CurrentUser() user: User,
  ) {
    return this.schedulesService.update(id, dto, user);
  }

  @Delete(':id')
  @RequirePermissions('schedules.delete')
  @ApiOperation({ summary: 'Delete a schedule (requires schedules.delete)' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.schedulesService.remove(id, user);
  }
}
