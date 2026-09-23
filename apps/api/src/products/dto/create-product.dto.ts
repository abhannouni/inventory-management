import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductClassification } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Sparkling Water 500ml' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'CC-500' })
  @IsString()
  sku: string;

  @ApiProperty({ example: 'Beverages' })
  @IsString()
  category: string;

  @ApiProperty({ example: false, default: false })
  @IsBoolean()
  @IsOptional()
  is_our_product?: boolean;

  @ApiProperty({ example: 'Sample Distributor Ltd.' })
  @IsString()
  distributeur: string;

  @ApiProperty({ example: 'Boissons' })
  @IsString()
  famille: string;

  @ApiProperty({ example: 'Sodas' })
  @IsString()
  sous_famille: string;

  @ApiProperty({ example: '500ml' })
  @IsString()
  format: string;

  @ApiPropertyOptional({ enum: ProductClassification, nullable: true })
  // An empty select posts "" — store it as "no classification".
  @Transform(({ value }) => (value === '' ? null : value))
  @IsEnum(ProductClassification)
  @IsOptional()
  classification?: ProductClassification | null;
}
