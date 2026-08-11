import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PromosService } from './promos.service';

@ApiTags('promos')
@ApiBearerAuth()
@Controller('promos')
@UseGuards(JwtAuthGuard)
export class PromosController {
  constructor(private readonly promosService: PromosService) {}

  @Get()
  @ApiOperation({ summary: 'Promos module status (feature pending — see message)' })
  status() {
    return this.promosService.status();
  }
}
