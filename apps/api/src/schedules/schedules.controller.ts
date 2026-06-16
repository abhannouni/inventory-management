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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { FindSchedulesDto } from './dto/find-schedules.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { SchedulesService } from './schedules.service';

@ApiTags('schedules')
@ApiBearerAuth()
@Controller('schedules')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a schedule entry (supervisor / admin / super_admin only)' })
  create(@Body() dto: CreateScheduleDto, @CurrentUser() user: User) {
    return this.schedulesService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List schedules scoped by role, filterable by month/status/user' })
  findAll(@Query() query: FindSchedulesDto, @CurrentUser() user: User) {
    return this.schedulesService.findAll(user, query);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a schedule (supervisor / admin / super_admin only)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateScheduleDto,
    @CurrentUser() user: User,
  ) {
    return this.schedulesService.update(id, dto, user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a schedule (supervisor / admin / super_admin only)' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.schedulesService.remove(id, user);
  }
}
