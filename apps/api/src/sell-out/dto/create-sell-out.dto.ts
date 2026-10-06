import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsPositive,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export class CreateSellOutDto {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  @IsUUID()
  product_id: string;

  @ApiProperty({ example: 'a1b2c3d4-...' })
  @IsUUID()
  store_id: string;

  @ApiProperty({ example: 10 })
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiProperty({ example: 25.5 })
  @IsNumber()
  @IsPositive()
  price: number;
}

export class SellOutLineDto {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  @IsUUID()
  product_id: string;

  @ApiProperty({ example: 10 })
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiProperty({ example: 25.5 })
  @IsNumber()
  @IsPositive()
  price: number;
}

/** Several products sold at one store, recorded together. */
export class CreateSellOutBatchDto {
  @ApiProperty({ example: 'a1b2c3d4-...' })
  @IsUUID()
  store_id: string;

  @ApiProperty({ type: [SellOutLineDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => SellOutLineDto)
  items: SellOutLineDto[];
}
