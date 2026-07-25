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
import { BulkAssignProductStoreDto } from './dto/bulk-assign-product-store.dto';
import { CreateProductStoreDto } from './dto/create-product-store.dto';
import { FindProductStoresDto } from './dto/find-product-stores.dto';
import { UpdateProductStoreDto } from './dto/update-product-store.dto';
import { ProductStoreService } from './product-store.service';

// This is the "Stock" module in the permission-to-page map (nav label "Stock",
// permission resource `inventory` — the resource code predates that naming and
// was kept to avoid an unrelated data-model rename).
@ApiTags('product-stores')
@ApiBearerAuth()
@Controller('product-stores')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductStoreController {
  constructor(private readonly productStoreService: ProductStoreService) {}

  @Get()
  @RequirePermissions('inventory.read')
  @ApiOperation({ summary: 'List product-store assignments, filter by store or product' })
  findAll(@Query() query: FindProductStoresDto, @CurrentUser() user: User) {
    return this.productStoreService.findAll(user, query);
  }

  @Get(':id')
  @RequirePermissions('inventory.read')
  @ApiOperation({ summary: 'Get a single product-store assignment' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.productStoreService.findOne(id, user);
  }

  @Post()
  @RequirePermissions('inventory.create')
  @ApiOperation({ summary: 'Assign a product to a store with expected quantity' })
  create(@Body() dto: CreateProductStoreDto, @CurrentUser() user: User) {
    return this.productStoreService.create(dto, user);
  }

  @Post('bulk-assign')
  @RequirePermissions('inventory.create')
  @ApiOperation({ summary: 'Replace the full product list assigned to a store' })
  bulkAssign(@Body() dto: BulkAssignProductStoreDto, @CurrentUser() user: User) {
    return this.productStoreService.bulkAssign(dto, user);
  }

  @Patch(':id')
  @RequirePermissions('inventory.update')
  @ApiOperation({ summary: 'Update expected quantity for a product-store assignment' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductStoreDto,
    @CurrentUser() user: User,
  ) {
    return this.productStoreService.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('inventory.delete')
  @ApiOperation({ summary: 'Remove a product from a store' })
  @ApiNoContentResponse()
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.productStoreService.remove(id, user);
  }
}
