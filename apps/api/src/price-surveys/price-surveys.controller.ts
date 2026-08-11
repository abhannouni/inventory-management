import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PriceSurveysService } from './price-surveys.service';

@ApiTags('price-surveys')
@ApiBearerAuth()
@Controller('price-surveys')
@UseGuards(JwtAuthGuard)
export class PriceSurveysController {
  constructor(private readonly priceSurveysService: PriceSurveysService) {}

  @Get()
  @ApiOperation({ summary: 'Price surveys module status (feature pending — see message)' })
  status() {
    return this.priceSurveysService.status();
  }
}
