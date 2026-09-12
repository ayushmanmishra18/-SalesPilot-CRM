import mongoose from 'mongoose'
import { config } from '../config'
import { logger } from './logger'

export async function connectDb(): Promise<void> {
  mongoose.connection.on('connected',    () => logger.info('MongoDB connected'))
  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'))
  mongoose.connection.on('error',        (err) => logger.error('MongoDB error', { err }))

  await mongoose.connect(config.mongoUri, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS:          45000,
    maxPoolSize:              10,
    minPoolSize:              2,
  })
}
