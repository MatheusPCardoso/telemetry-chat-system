import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createClient } from 'redis';
import { ConfigService } from '@nestjs/config';
import { resolveRedisHost } from '../common/config/runtime-config';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  @Get()
  check() {
    return { status: 'ok' };
  }

  @Get('db')
  async checkDatabase() {
    try {
      await this.prisma.$connect();
      return { status: 'ok', database: 'connected' };
    } catch (error) {
      return { status: 'error', database: 'disconnected', error: error.message };
    }
  }

  @Get('redis')
  async checkRedis() {
    const redisHost = resolveRedisHost(this.config.get('REDIS_HOST', 'redis'));
    const redisPort = this.config.get('REDIS_PORT', 6379);

    const client = createClient({
      socket: {
        host: redisHost,
        port: redisPort,
      },
    });

    try {
      await client.connect();
      await client.ping();
      await client.disconnect();
      return { status: 'ok', redis: 'connected' };
    } catch (error) {
      return { status: 'error', redis: 'disconnected', error: error.message };
    }
  }
}
