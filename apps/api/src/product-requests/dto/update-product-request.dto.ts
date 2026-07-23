import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUUID } from 'class-validator';

export class UpdateProductRequestDto {
  @ApiPropertyOptional({ example: 'uuid-of-store' })
  @IsUUID()
  @IsOptional()
  store_id?: string;

  @ApiPropertyOptional({ example: 'Yaourts' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  sous_famille?: string;

  @ApiPropertyOptional({ example: 40, description: 'Width in centimeters' })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  width?: number;

  @ApiPropertyOptional({ example: 180, description: 'Height in centimeters' })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  height?: number;

  @ApiPropertyOptional({ example: 50, description: 'Depth in centimeters' })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  depth?: number;

  @ApiPropertyOptional({ example: '/uploads/abc123.jpg', description: 'URL returned by POST /upload' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  image_url?: string;
}
