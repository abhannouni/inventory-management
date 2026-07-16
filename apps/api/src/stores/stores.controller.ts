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
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { StoresService } from './stores.service';

@ApiTags('stores')
@ApiBearerAuth()
@Controller('stores')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get()
  @RequirePermissions('pos.read')
  @ApiOperation({ summary: 'List stores (scoped by role)' })
  findAll(@CurrentUser() user: User) {
    return this.storesService.findAll(user);
  }

  @Get(':id')
  @RequirePermissions('pos.read')
  @ApiOperation({ summary: 'Get a store (scoped by role)' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.storesService.findOne(id, user);
  }

  @Get(':id/overview')
  @RequirePermissions('pos.read')
  @ApiOperation({
    summary:
      'Aggregated POS details: team, visit history, stock, availability, stockouts, photos (scoped by role)',
  })
  overview(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.storesService.overview(id, user);
  }

  @Post()
  @RequirePermissions('pos.create')
  @ApiOperation({ summary: 'Create a store (admin restricted to their region)' })
  create(@Body() dto: CreateStoreDto, @CurrentUser() user: User) {
    return this.storesService.create(dto, user);
  }

  @Patch(':id')
  @RequirePermissions('pos.update')
  @ApiOperation({ summary: 'Update a store (admin restricted to their region)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStoreDto,
    @CurrentUser() user: User,
  ) {
    return this.storesService.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('pos.delete')
  @ApiOperation({ summary: 'Delete a store (admin restricted to their region)' })
  @ApiNoContentResponse()
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.storesService.remove(id, user);
  }
}
