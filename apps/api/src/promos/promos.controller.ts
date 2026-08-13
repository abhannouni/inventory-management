import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiNoContentResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { ExcelTypeValidator } from '../products/validators/excel-type.validator';
import { CreatePromoDto } from './dto/create-promo.dto';
import { FindPromosDto } from './dto/find-promos.dto';
import { UpdatePromoItemDto } from './dto/update-promo-item.dto';
import { UploadPromoPictureDto } from './dto/upload-promo-picture.dto';
import { PromosService } from './promos.service';

const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

@ApiTags('promos')
@ApiBearerAuth()
@Controller('promos')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class PromosController {
  constructor(private readonly promosService: PromosService) {}

  @Get('current')
  @RequirePermissions('promos.read')
  @ApiOperation({ summary: 'The single live promo batch, with the caller\'s own picture per item' })
  getCurrent(@CurrentUser() user: User) {
    return this.promosService.getCurrent(user);
  }

  @Get('pictures/users')
  @RequirePermissions('promos.update')
  @ApiOperation({ summary: 'Super Admin: who has added at least one picture for a promo batch' })
  listPictureUploaders(@Query('promo_id') promoId?: string) {
    return this.promosService.listPictureUploaders(promoId);
  }

  @Get('pictures/users/:userId')
  @RequirePermissions('promos.update')
  @ApiOperation({ summary: "Super Admin: the exact table one uploader sees, with their pictures" })
  getUserPictureView(@Param('userId', ParseUUIDPipe) userId: string, @Query('promo_id') promoId?: string) {
    return this.promosService.getUserPictureView(promoId, userId);
  }

  @Get()
  @RequirePermissions('promos.update')
  @ApiOperation({ summary: 'Super Admin: every promo batch, newest first (history filters)' })
  listBatches(@Query() query: FindPromosDto) {
    return this.promosService.listBatches(query);
  }

  @Get(':id')
  @RequirePermissions('promos.update')
  @ApiOperation({ summary: 'Super Admin: a specific historical promo batch' })
  getBatch(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.promosService.getBatch(id, user);
  }

  @Post()
  @RequirePermissions('promos.create')
  @ApiOperation({ summary: 'Publish a new promo batch (replaces the currently active one)' })
  create(@Body() dto: CreatePromoDto, @CurrentUser() user: User) {
    return this.promosService.create(dto, user);
  }

  @Post('import')
  @RequirePermissions('promos.create')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMPORT_FILE_SIZE } }))
  @ApiOperation({ summary: 'Publish a new promo batch from an uploaded Excel file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  importFromFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: MAX_IMPORT_FILE_SIZE }), new ExcelTypeValidator()],
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    return this.promosService.importFromFile(file.buffer, user);
  }

  @Patch('items/:id')
  @RequirePermissions('promos.update')
  @ApiOperation({ summary: 'Edit one promo line (contenance / prices)' })
  updateItem(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePromoItemDto) {
    return this.promosService.updateItem(id, dto);
  }

  @Delete('items/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('promos.delete')
  @ApiOperation({ summary: 'Remove one promo line' })
  @ApiNoContentResponse()
  removeItem(@Param('id', ParseUUIDPipe) id: string) {
    return this.promosService.removeItem(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('promos.delete')
  @ApiOperation({ summary: 'Remove an entire promo batch' })
  @ApiNoContentResponse()
  removeBatch(@Param('id', ParseUUIDPipe) id: string) {
    return this.promosService.removeBatch(id);
  }

  @Post('items/:id/picture')
  @RequirePermissions('promos.upload_picture')
  @ApiOperation({ summary: "Attach/replace the caller's own shelf photo for a promo line" })
  uploadPicture(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UploadPromoPictureDto,
    @CurrentUser() user: User,
  ) {
    return this.promosService.uploadPicture(id, dto.url, user);
  }

  @Delete('items/:id/picture')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('promos.upload_picture')
  @ApiOperation({ summary: "Remove the caller's own shelf photo for a promo line" })
  @ApiNoContentResponse()
  removePicture(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.promosService.removePicture(id, user);
  }
}
