import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
@Processor('log-queue', {
  concurrency: 1,
})
export class LogProcessor extends WorkerHost implements OnModuleDestroy {
  private logBuffer: any[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly BUFFER_SIZE = 50;
  private readonly FLUSH_INTERVAL_MS = 5000;

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name === 'persist-log') {
      await this.persistLog(job);
    }
  }

  private async persistLog(job: Job): Promise<void> {
    const logEntry = job.data;

    this.logBuffer.push(logEntry);

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    if (this.logBuffer.length >= this.BUFFER_SIZE) {
      await this.flushBuffer();
    } else {
      this.flushTimer = setTimeout(() => {
        this.flushBuffer().catch((error) => {
          console.error('Log flush failed:', error.message);
        });
      }, this.FLUSH_INTERVAL_MS);
    }
  }

  private async flushBuffer(): Promise<void> {
    if (this.logBuffer.length === 0) {
      return;
    }

    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];

    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    try {
      await this.prisma.systemLog.createMany({
        data: logsToFlush,
      });
    } catch (error) {
      console.error('Log bulk insert failed:', error.message);
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }

    await this.flushBuffer();
  }
}
