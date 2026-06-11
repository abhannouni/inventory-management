import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class FindProductsDto {
  @ApiPropertyOptional({ example: 'uuid-of-store' })
  @IsUUID()
  @IsOptional()
  store_id?: string;
}
