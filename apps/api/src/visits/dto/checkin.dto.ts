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

  // Optional: when the `visits.gps_required` flag is off, the client never
  // requests device GPS, so nothing is sent. When the flag is on, the service
  // rejects a missing lat/lng itself (see `assertWithinGeofence`).
  @ApiPropertyOptional({ example: 34.0522 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiPropertyOptional({ example: -118.2437 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng?: number;

  // No `checkin_at`: the visit clock is started by the server. Accepting a
  // client timestamp would let a device with a wrong clock fake the duration.
}
