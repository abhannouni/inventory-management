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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuditItemsService } from './audit-items.service';
import { BulkAuditDto } from './dto/bulk-audit.dto';
import { CreateAuditItemDto } from './dto/create-audit-item.dto';
import { FindAuditItemsDto } from './dto/find-audit-items.dto';
import { UpdateAuditItemDto } from './dto/update-audit-item.dto';

@ApiTags('audit-items')
@ApiBearerAuth()
@Controller('audit-items')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditItemsController {
  constructor(private readonly auditItemsService: AuditItemsService) {}

  @Post()
  @ApiOperation({ summary: 'Record a single product scan for an open visit' })
  create(@Body() dto: CreateAuditItemDto, @CurrentUser() user: User) {
    return this.auditItemsService.create(dto, user);
  }

  @Post('bulk')
  @ApiOperation({
    summary: 'Submit full store scan in one call — upserts all items (POS-style)',
  })
  bulk(@Body() dto: BulkAuditDto, @CurrentUser() user: User) {
    return this.auditItemsService.bulk(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List all audit items for a visit (visit_id required)' })
  findAll(@Query() query: FindAuditItemsDto, @CurrentUser() user: User) {
    return this.auditItemsService.findAll(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single audit item' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.auditItemsService.findOne(id, user);
  }

  @Patch(':id')
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
  @ApiOperation({ summary: 'Remove an audit item — visit must still be open' })
  @ApiNoContentResponse()
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.auditItemsService.remove(id, user);
  }
}
