import { PartialType, PickType } from '@nestjs/swagger';
import { CreateQuizDto } from './create-quiz.dto';

/** Questions and answer mode are fixed once created — only the framing can change. */
export class UpdateQuizDto extends PartialType(
  PickType(CreateQuizDto, [
    'title',
    'description',
    'deadline',
    'duration_minutes',
  ] as const),
) {}
