import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AuditItemsController } from './audit-items.controller';
import { AuditItemsService } from './audit-items.service';

@Module({
  imports: [AuthModule],
  controllers: [AuditItemsController],
  providers: [AuditItemsService],
  exports: [AuditItemsService],
})
export class AuditItemsModule {}
