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
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateProductStoreDto } from './dto/create-product-store.dto';
import { FindProductStoresDto } from './dto/find-product-stores.dto';
import { UpdateProductStoreDto } from './dto/update-product-store.dto';
import { ProductStoreService } from './product-store.service';

@ApiTags('product-stores')
@ApiBearerAuth()
@Controller('product-stores')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductStoreController {
  constructor(private readonly productStoreService: ProductStoreService) {}

  @Get()
  @ApiOperation({ summary: 'List product-store assignments, filter by store or product' })
  findAll(@Query() query: FindProductStoresDto, @CurrentUser() user: User) {
    return this.productStoreService.findAll(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single product-store assignment' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.productStoreService.findOne(id, user);
  }

  @Post()
  @Roles(UserRole.super_admin, UserRole.admin)
  @ApiOperation({ summary: 'Assign a product to a store with expected quantity' })
  create(@Body() dto: CreateProductStoreDto, @CurrentUser() user: User) {
    return this.productStoreService.create(dto, user);
  }

  @Patch(':id')
  @Roles(UserRole.super_admin, UserRole.admin)
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
  @Roles(UserRole.super_admin, UserRole.admin)
  @ApiOperation({ summary: 'Remove a product from a store' })
  @ApiNoContentResponse()
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.productStoreService.remove(id, user);
  }
}
