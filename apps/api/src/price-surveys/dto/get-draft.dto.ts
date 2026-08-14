import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class GetDraftDto {
  @ApiProperty({ example: 'uuid-of-store' })
  @IsUUID()
  store_id: string;

  @ApiPropertyOptional({ example: 'uuid-of-user', description: 'Defaults to the caller; only manage-tier roles may pass another user' })
  @IsOptional()
  @IsUUID()
  user_id?: string;
}
