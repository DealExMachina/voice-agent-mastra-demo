import pino from 'pino';
import { config } from '../config/env.js';

export const logger = pino({
  level: config.LOG_LEVEL,
  transport: config.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
      messageFormat: '{msg} {req.url} {req.method}',
    }
  } : undefined,
  base: {
    env: config.NODE_ENV,
    version: '1.0.0',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Export logger instance
export default logger;