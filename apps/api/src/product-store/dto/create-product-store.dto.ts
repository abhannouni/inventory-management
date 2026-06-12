import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Min } from 'class-validator';

export class CreateProductStoreDto {
  @ApiProperty({ example: 'uuid-of-product' })
  @IsUUID()
  product_id: string;

  @ApiProperty({ example: 'uuid-of-store' })
  @IsUUID()
  store_id: string;

  @ApiProperty({ example: 24, description: 'Expected quantity for variance calculation' })
  @IsInt()
  @Min(0)
  expected_qty: number;
}
