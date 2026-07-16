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
import { AuditItemsService } from './audit-items.service';
import { BulkAuditDto } from './dto/bulk-audit.dto';
import { CreateAuditItemDto } from './dto/create-audit-item.dto';
import { FindAuditItemsDto } from './dto/find-audit-items.dto';
import { UpdateAuditItemDto } from './dto/update-audit-item.dto';

@ApiTags('audit-items')
@ApiBearerAuth()
@Controller('audit-items')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AuditItemsController {
  constructor(private readonly auditItemsService: AuditItemsService) {}

  @Post()
  @RequirePermissions('audit_items.create')
  @ApiOperation({ summary: 'Record a single product scan for an open visit' })
  create(@Body() dto: CreateAuditItemDto, @CurrentUser() user: User) {
    return this.auditItemsService.create(dto, user);
  }

  @Post('bulk')
  @RequirePermissions('audit_items.create')
  @ApiOperation({
    summary: 'Submit full store scan in one call — upserts all items (POS-style)',
  })
  bulk(@Body() dto: BulkAuditDto, @CurrentUser() user: User) {
    return this.auditItemsService.bulk(dto, user);
  }

  @Get()
  @RequirePermissions('audit_items.read')
  @ApiOperation({ summary: 'List all audit items for a visit (visit_id required)' })
  findAll(@Query() query: FindAuditItemsDto, @CurrentUser() user: User) {
    return this.auditItemsService.findAll(user, query);
  }

  @Get(':id')
  @RequirePermissions('audit_items.read')
  @ApiOperation({ summary: 'Get a single audit item' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.auditItemsService.findOne(id, user);
  }

  @Patch(':id')
  @RequirePermissions('audit_items.update')
  @ApiOperation({ summary: 'Correct an audit item — visit must still be open' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAuditItemDto,
    @CurrentUser() user: User,
  ) {
    return this.auditItemsService.update(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('audit_items.delete')
  @ApiOperation({ summary: 'Remove an audit item — visit must still be open' })
  @ApiNoContentResponse()
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.auditItemsService.remove(id, user);
  }
}
