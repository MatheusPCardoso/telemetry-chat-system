import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { LogService } from '../logging/log.service';
import { TelemetryEventDto } from './dto/telemetry-event.dto';

@Injectable()
export class IngestionService {
  constructor(
    @InjectQueue('telemetry-queue') private readonly telemetryQueue: Queue,
    private readonly logService: LogService,
  ) {}

  async collect(userId: string, events: TelemetryEventDto[]) {
    if (!events || events.length === 0) {
      throw new Error('Events array cannot be empty');
    }

    const secureEvents = events.map((event) => ({
      ...event,
      userId,
    }));

    await this.telemetryQueue.add('process-batch', { events: secureEvents });

    this.logService.info('IngestionService', 'Batch received', {
      eventCount: events.length,
      userId,
    });

    return {
      success: true,
      eventsReceived: events.length,
    };
  }
}
