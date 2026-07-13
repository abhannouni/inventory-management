import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsUUID, Max, Min } from 'class-validator';

export class CheckoutDto {
  @ApiProperty({ example: 'uuid-of-visit' })
  @IsUUID()
  visit_id: string;

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

  // No `checkout_at`: the server stamps the end of the visit and derives
  // duration_seconds from its own two timestamps.
}
