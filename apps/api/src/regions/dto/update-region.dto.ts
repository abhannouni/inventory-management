import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdateRegionDto {
  @ApiPropertyOptional({ example: 'North Region' })
  @IsString()
  @IsOptional()
  name?: string;
}
