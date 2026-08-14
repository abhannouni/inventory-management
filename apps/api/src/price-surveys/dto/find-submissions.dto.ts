import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

/** Manage-tier history filters, used to browse a user's past submitted rounds. */
export class FindSubmissionsDto {
  @ApiPropertyOptional({ example: 'uuid-of-user' })
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @ApiPropertyOptional({ example: 'uuid-of-store' })
  @IsOptional()
  @IsUUID()
  store_id?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
