import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateSellOutDto } from './dto/create-sell-out.dto';
import { SellOutService } from './sell-out.service';

@ApiTags('sell-out')
@ApiBearerAuth()
@Controller('sell-out')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SellOutController {
  constructor(private readonly sellOutService: SellOutService) {}

  @Get()
  @RequirePermissions('sell_out.read')
  @ApiOperation({ summary: 'List sell-out entries' })
  findAll() {
    return this.sellOutService.findAll();
  }

  @Post()
  @RequirePermissions('sell_out.create')
  @ApiOperation({ summary: 'Record a sell-out entry' })
  create(@Body() dto: CreateSellOutDto, @CurrentUser() user: User) {
    return this.sellOutService.create(dto, user);
  }
}
