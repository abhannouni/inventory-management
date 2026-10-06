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
import { CancelOrderDto, CreateOrderDto, FindOrdersDto } from './dto/order.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@ApiBearerAuth()
@Controller('orders')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @RequirePermissions('orders.read')
  @ApiOperation({ summary: 'Orders of the points of sale the caller may see' })
  findAll(@CurrentUser() user: User, @Query() query: FindOrdersDto) {
    return this.orders.findAll(user, query);
  }

  @Get('last-prices/:storeId')
  @RequirePermissions('orders.create')
  @ApiOperation({
    summary: 'Last unit price and TVA rate per product, to prefill a new order',
  })
  lastPrices(
    @CurrentUser() user: User,
    @Param('storeId', ParseUUIDPipe) storeId: string,
  ) {
    return this.orders.lastPrices(user, storeId);
  }

  @Get(':id')
  @RequirePermissions('orders.read')
  @ApiOperation({ summary: 'One order with its lines and invoice' })
  findOne(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.orders.findOne(user, id);
  }

  @Post()
  @RequirePermissions('orders.create')
  @ApiOperation({
    summary: 'Confirm an order for a point of sale and issue its invoice',
  })
  create(@CurrentUser() user: User, @Body() dto: CreateOrderDto) {
    return this.orders.create(user, dto);
  }

  @Patch(':id/cancel')
  @RequirePermissions('orders.update')
  @ApiOperation({ summary: 'Cancel an order (its invoice stays on record)' })
  cancel(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelOrderDto,
  ) {
    return this.orders.cancel(user, id, dto);
  }
}
