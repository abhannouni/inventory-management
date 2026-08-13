import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class PromoItemInputDto {
  @ApiProperty({ example: 'uuid-of-product' })
  @IsUUID()
  product_id: string;

  @ApiProperty({ example: '33cl', description: 'Size/volume variant for this promo line' })
  @IsString()
  @MaxLength(40)
  contenance: string;

  @ApiProperty({ example: 12.5 })
  @IsNumber()
  @IsPositive()
  original_price: number;

  @ApiProperty({ example: 9.9 })
  @IsNumber()
  @IsPositive()
  promo_price: number;
}

export class CreatePromoDto {
  @ApiPropertyOptional({ example: 'Promo Août 2026' })
  @IsString()
  @IsOptional()
  @MaxLength(120)
  title?: string;

  @ApiProperty({ type: [PromoItemInputDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PromoItemInputDto)
  items: PromoItemInputDto[];
}
