import Redis from 'ioredis'
import { config } from '../config'
import { logger } from './logger'

// Singleton ioredis client shared across the API process
export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 3,  // Fail fast instead of infinite retries
  enableReadyCheck:     true,
  retryStrategy:        (times) => Math.min(times * 100, 3000),
  lazyConnect:          true,
})

redis.on('connect',    () => logger.info('Redis connected'))
redis.on('error',      (err) => logger.warn('Redis error', { err: err.message }))
redis.on('close',      () => logger.warn('Redis connection closed'))

export async function connectRedis(): Promise<void> {
  await redis.connect()
}
