import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsInt, IsUUID, Min, ValidateNested } from 'class-validator';

export class ProductAssignmentItemDto {
  @ApiProperty({ example: 'uuid-of-product' })
  @IsUUID()
  product_id: string;

  @ApiProperty({ example: 24, description: 'Expected quantity for variance calculation' })
  @IsInt()
  @Min(0)
  expected_qty: number;
}

/**
 * Replaces the full product list assigned to a store: any existing assignment
 * whose product isn't in `items` is removed, the rest are created or have their
 * `expected_qty` updated to match.
 */
export class BulkAssignProductStoreDto {
  @ApiProperty({ example: 'uuid-of-store' })
  @IsUUID()
  store_id: string;

  @ApiProperty({ type: [ProductAssignmentItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductAssignmentItemDto)
  items: ProductAssignmentItemDto[];
}
