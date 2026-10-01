import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

const DAYS_DOC = {
  description:
    'Seven entries, Monday first: `{ start: "HH:mm", end: "HH:mm", break_minutes }` or null for a day off',
  example: [
    { start: '09:00', end: '18:00', break_minutes: 60 },
    { start: '09:00', end: '18:00', break_minutes: 60 },
    { start: '09:00', end: '18:00', break_minutes: 60 },
    { start: '09:00', end: '18:00', break_minutes: 60 },
    { start: '09:00', end: '18:00', break_minutes: 60 },
    { start: '09:00', end: '13:00', break_minutes: 0 },
    null,
  ],
};

class ScheduleChangeDto {
  @ApiPropertyOptional({
    description: 'Day the change takes effect, YYYY-MM-DD (defaults to today)',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  effective_from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}

/** A role's default hours. `days: null` removes the default. */
export class SetRoleScheduleDto extends ScheduleChangeDto {
  @ApiProperty({ ...DAYS_DOC, nullable: true })
  @ValidateIf((_, v) => v !== null)
  @IsArray()
  @ArrayMinSize(7)
  @ArrayMaxSize(7)
  days: unknown[] | null;
}

export const ASSIGN_MODES = ['custom', 'role_default', 'none'] as const;
export type AssignMode = (typeof ASSIGN_MODES)[number];

/**
 * Assigns hours to one or many employees in a single all-or-nothing write:
 *   `custom`       — the given `days` become each employee's personal schedule
 *   `role_default` — drop any personal schedule; follow the role's default
 *   `none`         — no working hours at all (overrides the role default)
 */
export class AssignSchedulesDto extends ScheduleChangeDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(5000)
  @IsUUID('all', { each: true })
  user_ids: string[];

  @ApiProperty({ enum: ASSIGN_MODES })
  @IsIn(ASSIGN_MODES)
  mode: AssignMode;

  @ApiPropertyOptional(DAYS_DOC)
  @ValidateIf((o: AssignSchedulesDto) => o.mode === 'custom')
  @IsArray()
  @ArrayMinSize(7)
  @ArrayMaxSize(7)
  days?: unknown[];
}
