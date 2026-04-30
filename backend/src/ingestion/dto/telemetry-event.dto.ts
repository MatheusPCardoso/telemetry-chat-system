import { IsString, IsDateString, IsObject, IsEnum } from 'class-validator';

export enum EventType {
  MESSAGE_STARTED = 'message_started',
  MESSAGE_SENT = 'message_sent',
  MESSAGE_EDITED = 'message_edited',
  MESSAGE_ABANDONED = 'message_abandoned',
  SESSION_STARTED = 'session_started',
  SESSION_ENDED = 'session_ended',
  BOT_RESPONSE_RATED = 'bot_response_rated',
  CONVERSATION_PAUSED = 'conversation_paused',
  CONVERSATION_RESUMED = 'conversation_resumed',
  QUICK_REPLY_USED = 'quick_reply_used',
  MESSAGE_HESITATION = 'message_hesitation',
  RAPID_FIRE_MESSAGES = 'rapid_fire_messages',
  COPY_BOT_RESPONSE = 'copy_bot_response',
  ERROR_DISPLAYED = 'error_displayed',
  RETRY_ATTEMPTED = 'retry_attempted',
  NETWORK_FAILURE = 'network_failure',
}

export class TelemetryEventDto {
  @IsString()
  sessionId: string;

  @IsEnum(EventType)
  eventType: string;

  @IsDateString()
  timestamp: string;

  @IsObject()
  metadata: Record<string, any>;
}
