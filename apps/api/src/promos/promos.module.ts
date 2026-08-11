import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PromosController } from './promos.controller';
import { PromosService } from './promos.service';

@Module({
  imports: [AuthModule],
  controllers: [PromosController],
  providers: [PromosService],
})
export class PromosModule {}
