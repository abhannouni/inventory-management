import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class FindProductRequestsDto {
  @ApiPropertyOptional({ description: 'Filter by store' })
  @IsUUID()
  @IsOptional()
  store_id?: string;
}
