import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class CheckoutDto {
  @ApiProperty({ example: 'uuid-of-visit' })
  @IsUUID()
  visit_id: string;

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

  // No `checkout_at`: the server stamps the end of the visit and derives
  // duration_seconds from its own two timestamps.
}
