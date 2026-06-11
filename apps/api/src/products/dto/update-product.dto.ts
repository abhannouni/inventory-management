import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateProductDto {
  @ApiPropertyOptional({ example: 'Coca Cola 500ml' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: 'CC-500' })
  @IsString()
  @IsOptional()
  sku?: string;

  @ApiPropertyOptional({ example: 24 })
  @IsInt()
  @Min(0)
  @IsOptional()
  expected_qty?: number;
}
