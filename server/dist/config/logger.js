import { createRequire } from 'node:module';
import pino from 'pino';
const require = createRequire(import.meta.url);
const pinoHttp = require('pino-http');
const baseLogger = pino({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport: process.env.NODE_ENV === 'production' ? undefined : {
        target: 'pino-pretty',
        options: {
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname'
        }
    }
});
export const logger = baseLogger;
export const httpLogger = pinoHttp({ logger: baseLogger });
