import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class SubmitQuizDto {
  @ApiPropertyOptional({
    description: 'Times the user left the quiz window while it ran',
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  leave_count?: number;
}
