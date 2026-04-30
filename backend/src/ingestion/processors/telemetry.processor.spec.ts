import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { TelemetryProcessor } from './telemetry.processor';
import { PrismaService } from '../../prisma/prisma.service';
import { LogService } from '../../logging/log.service';

describe('TelemetryProcessor', () => {
  let processor: TelemetryProcessor;
  let prismaService: PrismaService;
  let logService: LogService;

  const mockPrismaService = {
    telemetryEvent: {
      createMany: jest.fn(),
    },
  };

  const mockLogService = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelemetryProcessor,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: LogService,
          useValue: mockLogService,
        },
      ],
    }).compile();

    processor = module.get<TelemetryProcessor>(TelemetryProcessor);
    prismaService = module.get<PrismaService>(PrismaService);
    logService = module.get<LogService>(LogService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processBatch', () => {
    it('should process batch with valid events and perform bulk insert', async () => {
      const mockEvents = [
        {
          userId: 'user-123',
          sessionId: 'session-456',
          eventType: 'message_sent',
          timestamp: '2024-01-15T10:30:00.000Z',
          metadata: { textLength: 50 },
        },
        {
          userId: 'user-123',
          sessionId: 'session-456',
          eventType: 'message_started',
          timestamp: '2024-01-15T10:29:55.000Z',
          metadata: { deviceType: 'desktop' },
        },
      ];

      const mockJob = {
        name: 'process-batch',
        data: { events: mockEvents },
      } as Job;

      mockPrismaService.telemetryEvent.createMany.mockResolvedValue({
        count: 2,
      });

      await processor.process(mockJob);

      expect(prismaService.telemetryEvent.createMany).toHaveBeenCalledWith({
        data: [
          {
            userId: 'user-123',
            sessionId: 'session-456',
            eventType: 'message_sent',
            timestamp: new Date('2024-01-15T10:30:00.000Z'),
            metadata: { textLength: 50 },
          },
          {
            userId: 'user-123',
            sessionId: 'session-456',
            eventType: 'message_started',
            timestamp: new Date('2024-01-15T10:29:55.000Z'),
            metadata: { deviceType: 'desktop' },
          },
        ],
      });
    });

    it('should convert timestamp string to Date object', async () => {
      const mockEvents = [
        {
          userId: 'user-789',
          sessionId: 'session-abc',
          eventType: 'session_started',
          timestamp: '2024-02-20T14:45:30.500Z',
          metadata: {},
        },
      ];

      const mockJob = {
        name: 'process-batch',
        data: { events: mockEvents },
      } as Job;

      mockPrismaService.telemetryEvent.createMany.mockResolvedValue({
        count: 1,
      });

      await processor.process(mockJob);

      const callArgs =
        prismaService.telemetryEvent.createMany.mock.calls[0][0];
      const transformedEvent = callArgs.data[0];

      expect(transformedEvent.timestamp).toBeInstanceOf(Date);
      expect(transformedEvent.timestamp.toISOString()).toBe(
        '2024-02-20T14:45:30.500Z',
      );
    });

    it('should log success after processing batch', async () => {
      const mockEvents = [
        {
          userId: 'user-111',
          sessionId: 'session-222',
          eventType: 'message_sent',
          timestamp: '2024-03-10T08:15:00.000Z',
          metadata: { textLength: 25 },
        },
        {
          userId: 'user-111',
          sessionId: 'session-222',
          eventType: 'bot_response_rated',
          timestamp: '2024-03-10T08:15:05.000Z',
          metadata: { userSatisfaction: 'positive' },
        },
        {
          userId: 'user-111',
          sessionId: 'session-222',
          eventType: 'session_ended',
          timestamp: '2024-03-10T08:20:00.000Z',
          metadata: { sessionDuration: 300000 },
        },
      ];

      const mockJob = {
        name: 'process-batch',
        data: { events: mockEvents },
      } as Job;

      mockPrismaService.telemetryEvent.createMany.mockResolvedValue({
        count: 3,
      });

      await processor.process(mockJob);

      expect(logService.info).toHaveBeenCalledWith(
        'TelemetryProcessor',
        'Batch processed',
        { eventCount: 3 },
      );
    });

    it('should log error and rethrow exception when bulk insert fails', async () => {
      const mockEvents = [
        {
          userId: 'user-999',
          sessionId: 'session-error',
          eventType: 'message_sent',
          timestamp: '2024-04-01T12:00:00.000Z',
          metadata: {},
        },
      ];

      const mockJob = {
        name: 'process-batch',
        data: { events: mockEvents },
      } as Job;

      const dbError = new Error('Database connection failed');
      mockPrismaService.telemetryEvent.createMany.mockRejectedValue(dbError);

      await expect(processor.process(mockJob)).rejects.toThrow(
        'Database connection failed',
      );

      expect(logService.error).toHaveBeenCalledWith(
        'TelemetryProcessor',
        'Batch processing failed',
        { errorType: 'database' },
      );
    });

    it('should preserve metadata as JSON object', async () => {
      const complexMetadata = {
        textLength: 150,
        typingDurationMs: 5000,
        deviceType: 'mobile',
        viewportWidth: 375,
        viewportHeight: 667,
        locale: 'en-US',
        inputMethod: 'touch',
        nested: {
          level1: {
            level2: 'deep value',
          },
        },
        array: [1, 2, 3],
      };

      const mockEvents = [
        {
          userId: 'user-metadata-test',
          sessionId: 'session-metadata',
          eventType: 'message_sent',
          timestamp: '2024-05-15T16:30:00.000Z',
          metadata: complexMetadata,
        },
      ];

      const mockJob = {
        name: 'process-batch',
        data: { events: mockEvents },
      } as Job;

      mockPrismaService.telemetryEvent.createMany.mockResolvedValue({
        count: 1,
      });

      await processor.process(mockJob);

      const callArgs =
        prismaService.telemetryEvent.createMany.mock.calls[0][0];
      const transformedEvent = callArgs.data[0];

      expect(transformedEvent.metadata).toEqual(complexMetadata);
      expect(transformedEvent.metadata.nested.level1.level2).toBe(
        'deep value',
      );
      expect(transformedEvent.metadata.array).toEqual([1, 2, 3]);
    });
  });
});
