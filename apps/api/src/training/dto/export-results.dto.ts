import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsUUID } from 'class-validator';

/** Query strings arrive as "a,b" (or repeated keys) — normalise to an array. */
function toIdList(value: unknown): string[] {
  const parts = Array.isArray(value) ? value : [value];
  return parts
    .filter((v): v is string => typeof v === 'string')
    .flatMap((v) => v.split(','))
    .map((v) => v.trim())
    .filter(Boolean);
}

export class ExportResultsDto {
  @ApiProperty({
    description: 'Comma-separated quiz ids',
    example: 'uuid-1,uuid-2',
  })
  @Transform(({ value }: { value: unknown }) => toIdList(value))
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  quiz_ids: string[];
}
