import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProductClassification } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Sparkling Water 500ml' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'CC-500' })
  @IsString()
  @IsOptional()
  sku?: string;

  @ApiPropertyOptional({ example: 'Beverages' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  is_our_product?: boolean;

  @ApiPropertyOptional({ example: 'Sample Distributor Ltd.' })
  @IsString()
  @IsOptional()
  distributeur?: string;

  @ApiPropertyOptional({ example: 'Boissons' })
  @IsString()
  @IsOptional()
  famille?: string;

  @ApiPropertyOptional({ example: 'Sodas' })
  @IsString()
  @IsOptional()
  sous_famille?: string;

  @ApiPropertyOptional({ example: '500ml' })
  @IsString()
  @IsOptional()
  format?: string;

  @ApiPropertyOptional({ enum: ProductClassification, nullable: true })
  // An empty select posts "" — store it as "no classification".
  @Transform(({ value }) => (value === '' ? null : value))
  @IsEnum(ProductClassification)
  @IsOptional()
  classification?: ProductClassification | null;
}
