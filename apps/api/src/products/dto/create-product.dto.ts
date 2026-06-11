import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, IsUUID, Min } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'Coca Cola 500ml' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'CC-500' })
  @IsString()
  sku: string;

  @ApiProperty({ example: 24, description: 'Expected quantity for this store' })
  @IsInt()
  @Min(0)
  expected_qty: number;

  @ApiProperty({ example: 'uuid-of-store' })
  @IsUUID()
  store_id: string;
}
