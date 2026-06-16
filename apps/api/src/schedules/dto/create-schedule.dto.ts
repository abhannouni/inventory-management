import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateScheduleDto {
  @ApiProperty({ example: 'uuid-of-merchandiser' })
  @IsUUID()
  user_id: string;

  @ApiProperty({ example: 'uuid-of-store' })
  @IsUUID()
  store_id: string;

  @ApiProperty({ example: '2025-06-20T09:00:00' })
  @IsDateString()
  scheduled_at: string;

  @ApiPropertyOptional({ example: 'Check shelf 3A and seasonal display' })
  @IsOptional()
  @IsString()
  notes?: string;
}
