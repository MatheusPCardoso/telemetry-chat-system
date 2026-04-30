import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class LogService {
  constructor(@InjectQueue('log-queue') private readonly logQueue: Queue) {}

  info(context: string, message: string, metadata?: Record<string, any>): void {
    const logEntry = {
      level: 'info',
      context,
      message,
      metadata,
      timestamp: new Date(),
    };

    this.logQueue.add('persist-log', logEntry).catch(() => {});
  }

  warn(context: string, message: string, metadata?: Record<string, any>): void {
    const logEntry = {
      level: 'warn',
      context,
      message,
      metadata,
      timestamp: new Date(),
    };

    this.logQueue.add('persist-log', logEntry).catch(() => {});
  }

  error(context: string, message: string, metadata?: Record<string, any>): void {
    const logEntry = {
      level: 'error',
      context,
      message,
      metadata,
      timestamp: new Date(),
    };

    this.logQueue.add('persist-log', logEntry).catch(() => {});
  }
}
