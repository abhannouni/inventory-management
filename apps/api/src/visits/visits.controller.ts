import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CheckinDto } from './dto/checkin.dto';
import { CheckoutDto } from './dto/checkout.dto';
import { FindVisitsDto } from './dto/find-visits.dto';
import { VisitsService } from './visits.service';

@ApiTags('visits')
@ApiBearerAuth()
@Controller('visits')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  @Post('checkin')
  @ApiOperation({ summary: 'Check in to a store — validates GPS proximity (< 200 m)' })
  checkin(@Body() dto: CheckinDto, @CurrentUser() user: User) {
    return this.visitsService.checkin(dto, user);
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Check out of a visit — closes it and records GPS' })
  checkout(@Body() dto: CheckoutDto, @CurrentUser() user: User) {
    return this.visitsService.checkout(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List visits (scoped by role, filterable by store/status)' })
  findAll(@Query() query: FindVisitsDto, @CurrentUser() user: User) {
    return this.visitsService.findAll(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a visit with all its audit items' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.visitsService.findOne(id, user);
  }
}
