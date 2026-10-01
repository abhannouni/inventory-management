import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsUUID, Matches } from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';
import { STATUS_SEVERITY, type WorkStatus } from '../work-hours.util';

export const TRACKING_SORT_FIELDS = [
  'full_name',
  'role',
  'assigned',
  'worked',
  'remaining',
  'overtime',
  'status',
] as const;

/** Filters shared by the tracking table and the employee picker. */
export class EmployeeFilterDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  role_id?: string;

  @ApiPropertyOptional({
    description: 'Region — the organisational unit employees are grouped by',
  })
  @IsOptional()
  @IsUUID()
  region_id?: string;

  @ApiPropertyOptional({ description: "Filter to a supervisor's direct team" })
  @IsOptional()
  @IsUUID()
  supervisor_id?: string;
}

export class TrackingQueryDto extends EmployeeFilterDto {
  @ApiPropertyOptional({
    description: 'Day to report on, YYYY-MM-DD (defaults to today)',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;

  @ApiPropertyOptional({ enum: STATUS_SEVERITY })
  @IsOptional()
  @IsIn(STATUS_SEVERITY)
  status?: WorkStatus;
}
