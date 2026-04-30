import { INestApplication, ValidationPipe } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import { Queue } from 'bullmq';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { EventType } from '../src/ingestion/dto/telemetry-event.dto';
import { PrismaService } from '../src/prisma/prisma.service';

type Credentials = {
  email: string;
  password: string;
};

describe('Backend API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let telemetryQueue: Queue;
  let logQueue: Queue;

  const createdEmails = new Set<string>();

  const createCredentials = (): Credentials => {
    const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    return {
      email: `e2e.${uniqueId}@example.com`,
      password: 'Password123!',
    };
  };

  const registerUser = async (credentials: Credentials): Promise<string> => {
    const response = await request(app.getHttpServer())
      .post('/auth/signup')
      .send(credentials)
      .expect(201);

    createdEmails.add(credentials.email);

    expect(response.body).toMatchObject({
      success: true,
      userId: expect.any(String),
    });

    return response.body.userId as string;
  };

  const loginUser = async (
    credentials: Credentials,
  ): Promise<{ accessToken: string; refreshToken: string }> => {
    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .send(credentials)
      .expect(200);

    expect(response.body).toEqual({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });

    return response.body as { accessToken: string; refreshToken: string };
  };

  beforeAll(async () => {
    jest.setTimeout(60000);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.enableCors({
      origin: '*',
      credentials: true,
    });
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
    prisma = app.get(PrismaService);
    telemetryQueue = app.get<Queue>(getQueueToken('telemetry-queue'));
    logQueue = app.get<Queue>(getQueueToken('log-queue'));
  });

  afterAll(async () => {
    // Close queues first
    if (telemetryQueue) {
      await telemetryQueue.close();
    }

    if (logQueue) {
      await logQueue.close();
    }

    // Clean up test data
    if (prisma) {
      for (const email of createdEmails) {
        await prisma.user.deleteMany({
          where: { email },
        });
      }
      await prisma.$disconnect();
    }

    // Close app last
    if (app) {
      await app.close();
    }

    // Give time for cleanup
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  it('applies the same validation rules configured in production', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: 'invalid-email',
        password: 'short',
        extra: 'should-be-rejected',
      })
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      path: '/auth/signup',
      timestamp: expect.any(String),
    });
    expect(response.body.message).toEqual(
      expect.arrayContaining([
        'email must be an email',
        'password must be longer than or equal to 8 characters',
        'property extra should not exist',
      ]),
    );
  });

  it('completes the signup, login, profile, and refresh flow', async () => {
    const credentials = createCredentials();
    const userId = await registerUser(credentials);
    const { accessToken, refreshToken } = await loginUser(credentials);

    const profileResponse = await request(app.getHttpServer())
      .get('/auth/profile')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(profileResponse.body).toEqual({
      userId,
      email: credentials.email,
      message: 'Token is valid',
    });

    const refreshResponse = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    expect(refreshResponse.body).toEqual({
      accessToken: expect.any(String),
    });
  });

  it('accepts telemetry collection for an authenticated user', async () => {
    const credentials = createCredentials();
    await registerUser(credentials);
    const { accessToken } = await loginUser(credentials);

    const response = await request(app.getHttpServer())
      .post('/collect')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        events: [
          {
            sessionId: 'session-e2e',
            eventType: EventType.MESSAGE_SENT,
            timestamp: new Date().toISOString(),
            metadata: {
              messageLength: 42,
              source: 'e2e-test',
            },
          },
          {
            sessionId: 'session-e2e',
            eventType: EventType.BOT_RESPONSE_RATED,
            timestamp: new Date().toISOString(),
            metadata: {
              rating: 5,
              source: 'e2e-test',
            },
          },
        ],
      })
      .expect(202);

    expect(response.body).toEqual({
      success: true,
      eventsReceived: 2,
    });
  });
});
