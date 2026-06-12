import { ApiPropertyOptional } from '@nestjs/swagger';
import { VisitStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';

export class FindVisitsDto {
  @ApiPropertyOptional({ example: 'uuid-of-store' })
  @IsUUID()
  @IsOptional()
  store_id?: string;

  @ApiPropertyOptional({ enum: VisitStatus })
  @IsEnum(VisitStatus)
  @IsOptional()
  status?: VisitStatus;
}
