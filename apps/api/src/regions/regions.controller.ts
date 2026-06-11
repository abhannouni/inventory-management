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
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateRegionDto } from './dto/create-region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';
import { RegionsService } from './regions.service';

@ApiTags('regions')
@ApiBearerAuth()
@Controller('regions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RegionsController {
  constructor(private readonly regionsService: RegionsService) {}

  @Get()
  @ApiOperation({ summary: 'List regions (admin sees only their own)' })
  findAll(@CurrentUser() user: User) {
    return this.regionsService.findAll(user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a region (admin restricted to their own)' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.regionsService.findOne(id, user);
  }

  @Post()
  @Roles(UserRole.super_admin)
  @ApiOperation({ summary: 'Create a region (super_admin only)' })
  create(@Body() dto: CreateRegionDto) {
    return this.regionsService.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.super_admin)
  @ApiOperation({ summary: 'Update a region (super_admin only)' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRegionDto) {
    return this.regionsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.super_admin)
  @ApiOperation({ summary: 'Delete a region (super_admin only)' })
  @ApiNoContentResponse()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.regionsService.remove(id);
  }
}
