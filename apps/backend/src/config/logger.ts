import winston from 'winston';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Formato customizado para logs
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

// Configuração do logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    // Console com cores
    new winston.transports.Console({
      format: combine(
        colorize(),
        logFormat
      )
    }),
    // Arquivo de erros
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    // Arquivo de todos os logs
    new winston.transports.File({
      filename: 'logs/combined.log'
    })
  ]
});

// Se não estiver em produção, log de debug
if (process.env.NODE_ENV !== 'production') {
  logger.level = 'debug';
}
