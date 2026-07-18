import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class SetFeatureFlagDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  enabled: boolean;
}
