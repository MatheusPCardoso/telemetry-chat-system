import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IngestionService } from './ingestion.service';
import { LogService } from '../logging/log.service';
import { TelemetryEventDto } from './dto/telemetry-event.dto';

describe('IngestionService', () => {
  let service: IngestionService;
  let _telemetryQueue: Queue;
  let _logService: LogService;

  const mockQueue = {
    add: jest.fn(),
  };

  const mockLogService = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IngestionService,
        {
          provide: getQueueToken('telemetry-queue'),
          useValue: mockQueue,
        },
        {
          provide: LogService,
          useValue: mockLogService,
        },
      ],
    }).compile();

    service = module.get<IngestionService>(IngestionService);
    _telemetryQueue = module.get<Queue>(getQueueToken('telemetry-queue'));
    _logService = module.get<LogService>(LogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('collect', () => {
    it('should add job to queue with valid batch', async () => {
      const userId = 'user-123';
      const events: TelemetryEventDto[] = [
        {
          userId: 'fake-user-id', 
          sessionId: 'session-123',
          eventType: 'message_sent',
          timestamp: new Date().toISOString(),
          metadata: { textLength: 10 },
        },
        {
          userId: 'another-fake-id', 
          sessionId: 'session-123',
          eventType: 'message_started',
          timestamp: new Date().toISOString(),
          metadata: { typingDurationMs: 500 },
        },
      ];

      mockQueue.add.mockResolvedValue({ id: 'job-123' });

      const result = await service.collect(userId, events);

      expect(mockQueue.add).toHaveBeenCalledTimes(1);
      expect(mockQueue.add).toHaveBeenCalledWith('process-batch', {
        events: expect.arrayContaining([
          expect.objectContaining({
            userId: 'user-123',
            sessionId: 'session-123',
            eventType: 'message_sent',
          }),
          expect.objectContaining({
            userId: 'user-123',
            sessionId: 'session-123',
            eventType: 'message_started',
          }),
        ]),
      });
      expect(result).toEqual({
        success: true,
        eventsReceived: 2,
      });
    });

    it('should ALWAYS replace userId from JWT, never trust body', async () => {
      const jwtUserId = 'jwt-user-123';
      const events: TelemetryEventDto[] = [
        {
          userId: 'malicious-user-id', 
          sessionId: 'session-123',
          eventType: 'message_sent',
          timestamp: new Date().toISOString(),
          metadata: {},
        },
        {
          userId: 'another-malicious-id', 
          sessionId: 'session-456',
          eventType: 'session_started',
          timestamp: new Date().toISOString(),
          metadata: {},
        },
      ];

      mockQueue.add.mockResolvedValue({ id: 'job-123' });

      await service.collect(jwtUserId, events);

      
      const callArgs = mockQueue.add.mock.calls[0][1];
      expect(callArgs.events).toHaveLength(2);
      expect(callArgs.events[0].userId).toBe('jwt-user-123');
      expect(callArgs.events[1].userId).toBe('jwt-user-123');
      
      
      expect(callArgs.events[0].userId).not.toBe('malicious-user-id');
      expect(callArgs.events[1].userId).not.toBe('another-malicious-id');
    });

    it('should return immediately without awaiting queue processing', async () => {
      const userId = 'user-123';
      const events: TelemetryEventDto[] = [
        {
          userId: 'fake-id',
          sessionId: 'session-123',
          eventType: 'message_sent',
          timestamp: new Date().toISOString(),
          metadata: {},
        },
      ];

      
      let queueResolved = false;
      mockQueue.add.mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            queueResolved = true;
            resolve({ id: 'job-123' });
          }, 100); 
        });
      });

      const startTime = Date.now();
      const result = await service.collect(userId, events);
      const endTime = Date.now();

      
      
      expect(endTime - startTime).toBeLessThan(150);
      expect(result).toEqual({
        success: true,
        eventsReceived: 1,
      });
      
      
      await new Promise((resolve) => setTimeout(resolve, 150));
      expect(queueResolved).toBe(true);
    });

    it('should log batch received with correct eventCount', async () => {
      const userId = 'user-123';
      const events: TelemetryEventDto[] = [
        {
          userId: 'fake-id',
          sessionId: 'session-123',
          eventType: 'message_sent',
          timestamp: new Date().toISOString(),
          metadata: {},
        },
        {
          userId: 'fake-id',
          sessionId: 'session-123',
          eventType: 'message_started',
          timestamp: new Date().toISOString(),
          metadata: {},
        },
        {
          userId: 'fake-id',
          sessionId: 'session-123',
          eventType: 'session_started',
          timestamp: new Date().toISOString(),
          metadata: {},
        },
      ];

      mockQueue.add.mockResolvedValue({ id: 'job-123' });

      await service.collect(userId, events);

      expect(mockLogService.info).toHaveBeenCalledTimes(1);
      expect(mockLogService.info).toHaveBeenCalledWith(
        'IngestionService',
        'Batch received',
        {
          eventCount: 3,
          userId: 'user-123',
        },
      );
    });

    it('should throw error when events array is empty', async () => {
      const userId = 'user-123';
      const events: TelemetryEventDto[] = [];

      await expect(service.collect(userId, events)).rejects.toThrow(
        'Events array cannot be empty',
      );

      
      expect(mockQueue.add).not.toHaveBeenCalled();
      
      expect(mockLogService.info).not.toHaveBeenCalled();
    });

    it('should throw error when events is null or undefined', async () => {
      const userId = 'user-123';

      await expect(service.collect(userId, null as any)).rejects.toThrow(
        'Events array cannot be empty',
      );

      await expect(service.collect(userId, undefined as any)).rejects.toThrow(
        'Events array cannot be empty',
      );

      
      expect(mockQueue.add).not.toHaveBeenCalled();
    });
  });
});
