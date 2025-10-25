import http from 'node:http';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { httpLogger, logger } from './config/logger.js';
import apiRouter from './routes/index.js';
import { ChatGateway } from './socket/chatGateway.js';
const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cors({ origin: env.CORS_ORIGIN.split(','), credentials: true }));
app.use(httpLogger);
app.use('/api', apiRouter);
app.use((err, _req, res, _next) => {
    logger.error({ err }, 'unhandled application error');
    res.status(500).json({ error: 'Internal Server Error' });
});
const server = http.createServer(app);
const gateway = new ChatGateway(server);
gateway.onMessage(({ clientId }) => {
    logger.debug({ clientId }, 'relaying message via gateway');
});
server.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'tryme backend listening');
});
const shutdownSignals = ['SIGTERM', 'SIGINT'];
shutdownSignals.forEach(signal => {
    process.on(signal, () => {
        logger.info({ signal }, 'shutdown signal received');
        server.close(error => {
            if (error) {
                logger.error({ error }, 'error during shutdown');
                process.exitCode = 1;
            }
            logger.info('server shutdown complete');
            process.exit();
        });
    });
});
