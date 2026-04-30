import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LogService } from '../../logging/log.service';
import { timeout, TimeoutStrategy } from 'cockatiel';

@Injectable()
@Processor('telemetry-queue', {
  concurrency: 5,
})
export class TelemetryProcessor extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logService: LogService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === 'process-batch') {
      await this.processBatch(job);
    }
  }

  private async processBatch(job: Job): Promise<void> {
    try {
      const { events } = job.data;

      const prismaEvents = events.map((event: any) => ({
        userId: event.userId,
        sessionId: event.sessionId,
        eventType: event.eventType,
        timestamp: new Date(event.timestamp),
        metadata: event.metadata,
      }));

      const policy = timeout(5000, TimeoutStrategy.Aggressive);
      await policy.execute(() =>
        this.prisma.telemetryEvent.createMany({
          data: prismaEvents,
        }),
      );

      this.logService.info('TelemetryProcessor', 'Batch processed', {
        eventCount: events.length,
      });
    } catch (error) {
      this.logService.error('TelemetryProcessor', 'Batch processing failed', {
        errorType: 'database',
      });

      throw error;
    }
  }
}
