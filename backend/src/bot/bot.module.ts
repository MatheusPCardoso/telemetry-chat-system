import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LogModule } from '../logging/log.module';
import { BotService } from './bot.service';

@Module({
  imports: [ConfigModule, LogModule],
  providers: [BotService],
  exports: [BotService],
})
export class BotModule {}
