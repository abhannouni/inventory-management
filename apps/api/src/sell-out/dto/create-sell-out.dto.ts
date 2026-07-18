import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsPositive, IsUUID } from 'class-validator';

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
