import { Server as HttpServer } from 'http'
import { Server as IOServer, Socket } from 'socket.io'
import { verifyAccessToken } from './lib/jwt'
import { logger } from './lib/logger'
import { redis } from './lib/redis'
import { createAdapter } from '@socket.io/redis-adapter'

export function createSocketServer(httpServer: HttpServer): IOServer {
  const io = new IOServer(httpServer, {
    cors: {
      origin:      process.env['FRONTEND_URL'] ?? 'http://localhost:5173',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  })

  // Redis adapter — required for multi-instance / Render scaling
  // Uses two separate Redis connections (pub + sub) as required by socket.io-redis-adapter
  const pubClient = redis.duplicate()
  const subClient = redis.duplicate()

  Promise.all([pubClient.connect(), subClient.connect()])
    .then(() => {
      io.adapter(createAdapter(pubClient, subClient))
      logger.info('Socket.IO Redis adapter connected')
    })
    .catch(err => logger.warn('Socket.IO Redis adapter failed — running without adapter', { err: err.message }))

  // ── JWT auth handshake  (resolves plan risk A7) ────────────────────────────
  // Frontend sends: io(URL, { auth: { token } })
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined
    if (!token) {
      next(new Error('Authentication required'))
      return
    }
    try {
      const payload = verifyAccessToken(token)
      ;(socket as any).userId   = payload.userId
      ;(socket as any).tenantId = payload.tenantId
      ;(socket as any).role     = payload.role
      next()
    } catch {
      next(new Error('Invalid or expired token'))
    }
  })

  io.on('connection', (socket: Socket) => {
    const userId   = (socket as any).userId   as string
    const tenantId = (socket as any).tenantId as string

    logger.debug('socket connected', { userId, tenantId, socketId: socket.id })

    // Every authenticated socket joins two rooms automatically:
    //  1. tenant room  — for board-wide broadcasts (deal:moved, etc.)
    //  2. personal room — for per-user notifications
    socket.join(`tenant:${tenantId}`)
    socket.join(`tenant:${tenantId}:user:${userId}`)

    // ── join:record — called by deal/contact detail pages ─────────────────
    socket.on('join:record', ({ type, id }: { type: string; id: string }) => {
      if (!type || !id) return
      const room = `record:${type}:${id}`
      socket.join(room)
      logger.debug('socket joined record room', { userId, room })
    })

    // ── leave:record ───────────────────────────────────────────────────────
    socket.on('leave:record', ({ type, id }: { type: string; id: string }) => {
      if (!type || !id) return
      socket.leave(`record:${type}:${id}`)
    })

    socket.on('disconnect', (reason) => {
      logger.debug('socket disconnected', { userId, tenantId, reason })
    })

    socket.on('error', (err) => {
      logger.warn('socket error', { userId, err: err.message })
    })
  })

  return io
}
