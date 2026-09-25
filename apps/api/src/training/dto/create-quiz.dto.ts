import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { QuizAnswerMode } from '@prisma/client';

/**
 * The quiz-level fields sent alongside the Excel file (multipart form fields,
 * so numbers arrive as strings — hence the `@Type` coercion).
 */
export class CreateQuizDto {
  @ApiProperty({ example: 'Merchandising basics' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  title: string;

  @ApiPropertyOptional({ example: 'Quick check on the new shelf standards.' })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: '2026-10-15T18:00:00.000Z' })
  @IsDateString()
  deadline: string;

  @ApiProperty({ enum: QuizAnswerMode, example: QuizAnswerMode.single })
  @IsEnum(QuizAnswerMode)
  answer_mode: QuizAnswerMode;

  @ApiProperty({
    example: 15,
    description: 'Time allowed once started, in minutes',
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1440)
  duration_minutes: number;
}
