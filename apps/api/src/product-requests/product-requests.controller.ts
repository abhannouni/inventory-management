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
import { ApiBearerAuth, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateProductRequestDto } from './dto/create-product-request.dto';
import { FindProductRequestsDto } from './dto/find-product-requests.dto';
import { UpdateProductRequestDto } from './dto/update-product-request.dto';
import { ProductRequestsService } from './product-requests.service';

@ApiTags('product-requests')
@ApiBearerAuth()
@Controller('product-requests')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductRequestsController {
  constructor(private readonly productRequestsService: ProductRequestsService) {}

  @Get()
  @RequirePermissions('product_requests.read')
  @ApiOperation({ summary: 'List custom product requests, filter by store' })
  findAll(@Query() query: FindProductRequestsDto, @CurrentUser() user: User) {
    return this.productRequestsService.findAll(user, query);
  }

  @Get(':id')
  @RequirePermissions('product_requests.read')
  @ApiOperation({ summary: 'Get a single custom product request' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.productRequestsService.findOne(id, user);
  }

  @Post()
  @RequirePermissions('product_requests.create')
  @ApiOperation({ summary: 'Submit a custom product request (store, sub-family, dimensions, photo)' })
  create(@Body() dto: CreateProductRequestDto, @CurrentUser() user: User) {
    return this.productRequestsService.create(dto, user);
  }

  @Patch(':id')
  @RequirePermissions('product_requests.update')
  @ApiOperation({ summary: 'Update a custom product request' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductRequestDto,
    @CurrentUser() user: User,
  ) {
    return this.productRequestsService.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('product_requests.delete')
  @ApiOperation({ summary: 'Remove a custom product request' })
  @ApiNoContentResponse()
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.productRequestsService.remove(id, user);
  }
}
