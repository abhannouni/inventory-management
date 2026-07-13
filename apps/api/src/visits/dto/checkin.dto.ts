import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class CheckinDto {
  @ApiProperty({ example: 'uuid-of-store' })
  @IsUUID()
  store_id: string;

  @ApiPropertyOptional({ example: 'uuid-of-schedule', description: 'Link this visit to a planned schedule entry' })
  @IsOptional()
  @IsUUID()
  schedule_id?: string;

  @ApiProperty({ example: 34.052200 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({ example: -118.243700 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  // No `checkin_at`: the visit clock is started by the server. Accepting a
  // client timestamp would let a device with a wrong clock fake the duration.
}
