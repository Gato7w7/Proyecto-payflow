const winston = require('winston');

// Formato JSON para logs estructurados
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { 
    service: 'transaction-validator',
    environment: process.env.NODE_ENV || 'development'
  },
  transports: [
    // Logs en consola (coloridos para desarrollo)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
          return `${timestamp} [${level}]: ${message} ${metaStr}`;
        })
      )
    }),
    
    // Logs de error en archivo
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: logFormat
    }),
    
    // Todos los logs en archivo
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: logFormat
    })
  ]
});

module.exports = { logger };
