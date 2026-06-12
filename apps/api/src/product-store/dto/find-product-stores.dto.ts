import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class FindProductStoresDto {
  @ApiPropertyOptional({ description: 'Filter by store' })
  @IsUUID()
  @IsOptional()
  store_id?: string;

  @ApiPropertyOptional({ description: 'Filter by product' })
  @IsUUID()
  @IsOptional()
  product_id?: string;
}
