import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { LogService } from './log.service';
import { LogProcessor } from './processors/log.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [
    QueueModule,
    BullModule.registerQueue({ name: 'log-queue' }),
    PrismaModule,
  ],
  providers: [LogService, LogProcessor],
  exports: [LogService],
})
export class LogModule {}
