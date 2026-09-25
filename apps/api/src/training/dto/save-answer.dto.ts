import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

export class SaveAnswerDto {
  @ApiProperty()
  @IsUUID()
  question_id: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4)
  @IsUUID('all', { each: true })
  option_ids: string[];
}
