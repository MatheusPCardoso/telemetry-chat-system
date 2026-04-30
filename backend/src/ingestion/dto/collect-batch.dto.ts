import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TelemetryEventDto } from './telemetry-event.dto';

export class CollectBatchDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TelemetryEventDto)
  events: TelemetryEventDto[];
}
