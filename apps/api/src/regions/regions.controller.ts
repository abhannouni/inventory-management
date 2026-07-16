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
import { CreateRegionDto } from './dto/create-region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';
import { RegionsService } from './regions.service';

@ApiTags('regions')
@ApiBearerAuth()
@Controller('regions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RegionsController {
  constructor(private readonly regionsService: RegionsService) {}

  @Get()
  @RequirePermissions('regions.read')
  @ApiOperation({ summary: 'List regions (admin sees only their own)' })
  findAll(@CurrentUser() user: User) {
    return this.regionsService.findAll(user);
  }

  @Get(':id')
  @RequirePermissions('regions.read')
  @ApiOperation({ summary: 'Get a region (admin restricted to their own)' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.regionsService.findOne(id, user);
  }

  @Post()
  @RequirePermissions('regions.create')
  @ApiOperation({ summary: 'Create a region' })
  create(@Body() dto: CreateRegionDto) {
    return this.regionsService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('regions.update')
  @ApiOperation({ summary: 'Update a region' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRegionDto) {
    return this.regionsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('regions.delete')
  @ApiOperation({ summary: 'Delete a region' })
  @ApiNoContentResponse()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.regionsService.remove(id);
  }
}
