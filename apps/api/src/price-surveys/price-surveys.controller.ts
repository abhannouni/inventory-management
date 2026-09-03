import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequireAnyPermission } from '../auth/decorators/require-any-permission.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { AssignProductsDto } from './dto/assign-products.dto';
import { FindAssignmentsDto } from './dto/find-assignments.dto';
import { FindSubmissionsDto } from './dto/find-submissions.dto';
import { GetDraftDto } from './dto/get-draft.dto';
import { SaveSubmissionDto } from './dto/save-submission.dto';
import { PriceSurveysService } from './price-surveys.service';

@ApiTags('price-surveys')
@ApiBearerAuth()
@Controller('price-surveys')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PriceSurveysController {
  constructor(private readonly priceSurveysService: PriceSurveysService) {}

  @Get('draft')
  @RequireAnyPermission('price_surveys.update', 'price_surveys.manage')
  @ApiOperation({ summary: "Get-or-create the current (live) round for a user's PDV" })
  getDraft(@Query() query: GetDraftDto, @CurrentUser() user: User) {
    return this.priceSurveysService.getDraft(query, user);
  }

  @Patch('submissions/:id')
  @RequireAnyPermission('price_surveys.update', 'price_surveys.manage')
  @ApiOperation({ summary: 'Bulk-save item values on a draft round' })
  saveSubmission(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SaveSubmissionDto,
    @CurrentUser() user: User,
  ) {
    return this.priceSurveysService.saveSubmission(id, dto, user);
  }

  @Post('submissions/:id/new-round')
  @RequireAnyPermission('price_surveys.update', 'price_surveys.manage')
  @ApiOperation({ summary: '"Nouveau relevé de prix": finalize the current round and open a fresh one' })
  newRound(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.priceSurveysService.newRound(id, user);
  }

  @Get('submissions')
  @RequirePermissions('price_surveys.manage')
  @ApiOperation({ summary: 'History of submitted rounds, newest first' })
  listSubmissions(@Query() query: FindSubmissionsDto) {
    return this.priceSurveysService.listSubmissions(query);
  }

  @Get('submissions/:id')
  @RequirePermissions('price_surveys.manage')
  @ApiOperation({ summary: 'One submission (draft or historical), read-only detail' })
  getSubmission(@Param('id', ParseUUIDPipe) id: string) {
    return this.priceSurveysService.getSubmission(id);
  }

  @Get('assignments')
  @RequirePermissions('price_surveys.manage')
  @ApiOperation({ summary: "Current product list assigned to a user's PDV" })
  getAssignments(@Query() query: FindAssignmentsDto) {
    return this.priceSurveysService.getAssignments(query);
  }

  @Put('assignments')
  @RequirePermissions('price_surveys.manage')
  @ApiOperation({ summary: "Replace the full product list assigned to a user's PDV" })
  setAssignments(@Body() dto: AssignProductsDto, @CurrentUser() user: User) {
    return this.priceSurveysService.setAssignments(dto, user);
  }
}
