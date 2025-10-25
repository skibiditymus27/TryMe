import { WebSocketServer } from 'ws';
import { logger } from '../config/logger.js';
import { generateSessionSecret } from '../services/tokenService.js';
export class ChatGateway {
    wss;
    clients = new Map();
    handlers = new Set();
    constructor(server) {
        this.wss = new WebSocketServer({ server, path: '/ws' });
        this.wss.on('connection', (socket, request) => {
            const requestUrl = request.url ?? '';
            const clientId = new URL(requestUrl, 'ws://localhost').searchParams.get('id') ?? generateSessionSecret();
            const record = {
                id: clientId,
                socket,
                sessionSecret: generateSessionSecret()
            };
            this.clients.set(clientId, record);
            logger.info({ clientId }, 'client connected');
            socket.send(JSON.stringify({ type: 'welcome', clientId }));
            socket.on('message', (data) => {
                this.handleIncomingMessage(clientId, data.toString());
            });
            socket.on('close', () => {
                this.clients.delete(clientId);
                logger.info({ clientId }, 'client disconnected');
            });
        });
    }
    onMessage(handler) {
        this.handlers.add(handler);
    }
    handleIncomingMessage(clientId, rawPayload) {
        this.handlers.forEach((handler) => handler({ clientId, rawPayload }));
        const client = this.clients.get(clientId);
        if (!client) {
            return;
        }
        try {
            const payload = JSON.parse(rawPayload);
            client.socket.send(JSON.stringify({ type: 'echo', payload }));
        }
        catch (error) {
            logger.warn({ clientId, error }, 'invalid message payload');
        }
    }
}
