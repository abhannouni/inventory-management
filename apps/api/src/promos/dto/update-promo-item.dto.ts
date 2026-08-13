import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class UpdatePromoItemDto {
  @ApiPropertyOptional({ example: '1L' })
  @IsString()
  @IsOptional()
  @MaxLength(40)
  contenance?: string;

  @ApiPropertyOptional({ example: 12.5 })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  original_price?: number;

  @ApiPropertyOptional({ example: 9.9 })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  promo_price?: number;
}
