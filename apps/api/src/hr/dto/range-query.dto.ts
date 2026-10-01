import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';

export class RangeQueryDto {
  @ApiPropertyOptional({
    description: 'First day, YYYY-MM-DD (defaults to this week’s Monday)',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @ApiPropertyOptional({
    description: 'Last day, YYYY-MM-DD, inclusive (defaults to from + 6 days)',
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;
}
