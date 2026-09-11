import winston from 'winston'
import { config } from '../config'

export const logger = winston.createLogger({
  level:  config.nodeEnv === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    config.nodeEnv === 'production'
      ? winston.format.json()
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            const extras = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : ''
            return `${timestamp} ${level}: ${message}${extras}`
          })
        )
  ),
  transports: [new winston.transports.Console()],
})

// Attach requestId context easily
export function reqLogger(requestId: string) {
  return logger.child({ requestId })
}
