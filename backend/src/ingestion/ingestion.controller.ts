import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { IngestionService } from './ingestion.service';
import { CollectBatchDto } from './dto/collect-batch.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class IngestionController {
  constructor(private readonly ingestionService: IngestionService) {}

  @Post('collect')
  @HttpCode(202)
  async collect(@Request() req, @Body() collectDto: CollectBatchDto) {
    const userId = req.user.userId;

    const result = await this.ingestionService.collect(
      userId,
      collectDto.events,
    );

    return {
      success: true,
      eventsReceived: result.eventsReceived,
    };
  }
}
