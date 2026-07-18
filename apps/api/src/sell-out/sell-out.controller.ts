import {
  Body,
  Controller,
  Get,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { ExcelTypeValidator } from '../products/validators/excel-type.validator';
import { CreateSellOutDto } from './dto/create-sell-out.dto';
import { SellOutService } from './sell-out.service';

const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

@ApiTags('sell-out')
@ApiBearerAuth()
@Controller('sell-out')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SellOutController {
  constructor(private readonly sellOutService: SellOutService) {}

  @Get()
  @RequirePermissions('sell_out.read')
  @ApiOperation({ summary: 'List sell-out entries' })
  findAll() {
    return this.sellOutService.findAll();
  }

  @Post()
  @RequirePermissions('sell_out.create')
  @ApiOperation({ summary: 'Record a sell-out entry' })
  create(@Body() dto: CreateSellOutDto, @CurrentUser() user: User) {
    return this.sellOutService.create(dto, user);
  }

  @Post('bulk-import')
  @RequirePermissions('sell_out.create')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_IMPORT_FILE_SIZE } }))
  @ApiOperation({ summary: 'Bulk-create sell-out entries from an uploaded Excel file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  bulkImport(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_IMPORT_FILE_SIZE }),
          new ExcelTypeValidator(),
        ],
      }),
    )
    file: Express.Multer.File,
    @CurrentUser() user: User,
  ) {
    return this.sellOutService.bulkImportFromFile(file.buffer, user);
  }
}
