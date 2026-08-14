import { ApiProperty } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

/**
 * Replaces the full product list assigned to a (user, store) pair: anything
 * already assigned that isn't in `product_ids` is removed, the rest created.
 */
export class AssignProductsDto {
  @ApiProperty({ example: 'uuid-of-user' })
  @IsUUID()
  user_id: string;

  @ApiProperty({ example: 'uuid-of-store' })
  @IsUUID()
  store_id: string;

  @ApiProperty({ type: [String], example: ['uuid-of-product-1', 'uuid-of-product-2'] })
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  product_ids: string[];
}
