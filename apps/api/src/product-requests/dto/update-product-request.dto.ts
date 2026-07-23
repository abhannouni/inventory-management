import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

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

  @ApiPropertyOptional({
    example: ['/uploads/abc123.jpg'],
    description: 'URLs returned by POST /upload — 1 to 5 photos',
    type: [String],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  @IsOptional()
  image_urls?: string[];
}
