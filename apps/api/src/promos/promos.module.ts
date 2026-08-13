import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PromosController } from './promos.controller';
import { PromosService } from './promos.service';

@Module({
  imports: [AuthModule, NotificationsModule],
  controllers: [PromosController],
  providers: [PromosService],
})
export class PromosModule {}
