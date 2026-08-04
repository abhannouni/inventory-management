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
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { RequireAnyPermission } from '../auth/decorators/require-any-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';
import { ExcelTypeValidator } from './validators/excel-type.validator';

const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  // Also readable by whoever can log an audit — the audit-item picker needs
  // the catalog even for roles without standalone Products-page access.
  @RequireAnyPermission('products.read', 'audit_items.create', 'audit_items.update')
  @ApiOperation({ summary: 'List all products in the catalog' })
  findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  @RequireAnyPermission('products.read', 'audit_items.create', 'audit_items.update')
  @ApiOperation({ summary: 'Get a product from the catalog' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @RequirePermissions('products.create')
  @ApiOperation({ summary: 'Add a product to the catalog' })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Post('bulk-import')
  @RequirePermissions('products.create')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_IMPORT_FILE_SIZE } }),
  )
  @ApiOperation({ summary: 'Bulk-create products from an uploaded Excel file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
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
  ) {
    return this.productsService.bulkImportFromFile(file.buffer);
  }

  @Patch(':id')
  @RequirePermissions('products.update')
  @ApiOperation({ summary: 'Update a catalog product' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('products.delete')
  @ApiOperation({ summary: 'Delete a catalog product' })
  @ApiNoContentResponse()
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.remove(id);
  }
}
