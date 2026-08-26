import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString } from 'class-validator';

export class ReviewVisitPlanDto {
  @ApiProperty({ enum: ['approve', 'decline'] })
  @IsIn(['approve', 'decline'])
  action: 'approve' | 'decline';

  @ApiPropertyOptional({ description: 'Optional note, shown to the plan owner — required in spirit for a decline' })
  @IsOptional()
  @IsString()
  note?: string;
}
