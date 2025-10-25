import type { IncomingMessage, Server as HttpServer } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';

import { logger } from '../config/logger.js';
import { generateSessionSecret } from '../services/tokenService.js';

type ClientRecord = {
  id: string;
  socket: WebSocket;
  sessionSecret: string;
};

type MessageHandler = (payload: { clientId: string; rawPayload: string }) => void;

export class ChatGateway {
  private readonly wss: WebSocketServer;
  private readonly clients = new Map<string, ClientRecord>();
  private readonly handlers = new Set<MessageHandler>();

  constructor(server: HttpServer) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.wss.on('connection', (socket: WebSocket, request: IncomingMessage) => {
      const requestUrl = request.url ?? '';
      const clientId = new URL(requestUrl, 'ws://localhost').searchParams.get('id') ?? generateSessionSecret();
      const record: ClientRecord = {
        id: clientId,
        socket,
        sessionSecret: generateSessionSecret()
      };
      this.clients.set(clientId, record);
      logger.info({ clientId }, 'client connected');
      socket.send(JSON.stringify({ type: 'welcome', clientId }));
      socket.on('message', (data: WebSocket.RawData) => {
        this.handleIncomingMessage(clientId, data.toString());
      });
      socket.on('close', () => {
        this.clients.delete(clientId);
        logger.info({ clientId }, 'client disconnected');
      });
    });
  }

  public onMessage(handler: MessageHandler): void {
    this.handlers.add(handler);
  }

  private handleIncomingMessage(clientId: string, rawPayload: string): void {
  this.handlers.forEach((handler: MessageHandler) => handler({ clientId, rawPayload }));
    const client = this.clients.get(clientId);
    if (!client) {
      return;
    }
    try {
      const payload = JSON.parse(rawPayload);
      client.socket.send(JSON.stringify({ type: 'echo', payload }));
    } catch (error) {
      logger.warn({ clientId, error }, 'invalid message payload');
    }
  }
}
