import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { IngestionService } from './ingestion.service';
import { IngestionController } from './ingestion.controller';
import { TelemetryProcessor } from './processors/telemetry.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { LogModule } from '../logging/log.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [
    QueueModule,
    BullModule.registerQueue({ name: 'telemetry-queue' }),
    PrismaModule,
    LogModule,
  ],
  providers: [IngestionService, TelemetryProcessor],
  controllers: [IngestionController],
  exports: [IngestionService],
})
export class IngestionModule {}
