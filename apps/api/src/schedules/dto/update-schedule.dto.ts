import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ScheduleStatus } from '@prisma/client';

export class UpdateScheduleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  store_id?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduled_at?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ enum: ScheduleStatus })
  @IsOptional()
  @IsEnum(ScheduleStatus)
  status?: ScheduleStatus;
}
