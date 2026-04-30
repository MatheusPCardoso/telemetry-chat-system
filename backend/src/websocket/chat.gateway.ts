import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LogService } from '../logging/log.service';
import { BotService } from '../bot/bot.service';

@WebSocketGateway({ cors: true })
@Injectable()
export class ChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly logService: LogService,
    private readonly botService: BotService,
  ) {}

  afterInit(server: Server) {
    server.engine.use((req, res, next) => {
      res.setHeader(
        'Access-Control-Allow-Origin',
        this.configService.get('CORS_ORIGIN') || 'http://localhost:5173',
      );
      next();
    });
  }

  handleConnection(client: Socket) {
    const token =
      client.handshake.auth.token ||
      client.handshake.headers.authorization?.split(' ')[1];

    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const payload = this.jwtService.verify(token);
      client.data.userId = payload.userId;
      client.data.sessionId = client.handshake.auth.sessionId || client.id;

      this.logService.info('ChatGateway', 'Client connected', {
        userId: payload.userId,
        sessionId: client.data.sessionId,
        clientId: client.id,
      });
    } catch {
      client.disconnect();
      return;
    }
  }

  handleDisconnect(client: Socket) {
    this.logService.info('ChatGateway', 'Client disconnected', {
      userId: client.data.userId,
      clientId: client.id,
    });
  }

  @SubscribeMessage('chat_message')
  async handleMessage(
    @MessageBody() data: { message: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    const sessionId = client.data.sessionId;

    if (!data.message || data.message.trim().length === 0) {
      client.emit('error', { message: 'Message cannot be empty' });
      return;
    }

    try {
      this.logService.info('ChatGateway', 'Message received', {
        userId,
        sessionId,
        messageLength: data.message.length,
      });

      const response = await this.botService.generateResponse(data.message, {
        userId,
        sessionId,
      });

      this.logService.info('ChatGateway', 'Response generated', {
        userId,
        sessionId,
        source: response.source,
      });

      client.emit('bot_response', {
        content: response.content,
        source: response.source,
        quickReplies: response.quickReplies,
        timestamp: new Date().toISOString(),
      });
    } catch {
      this.logService.error('ChatGateway', 'Error processing message', {
        userId,
        errorType: 'processing_error',
      });
      client.emit('error', { message: 'Failed to process message' });
    }
  }
}
