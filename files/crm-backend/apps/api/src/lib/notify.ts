import { v4 as uuidv4 } from 'uuid'
import mongoose from 'mongoose'
import { Notification } from '../models/Notification'
import { Server as IOServer } from 'socket.io'

let _io: IOServer | null = null

export function setIo(io: IOServer): void {
  _io = io
}

export async function createNotification(opts: {
  tenantId:  mongoose.Types.ObjectId
  userId:    mongoose.Types.ObjectId
  type:      string
  message:   string
  relatedTo: { type: string; id: mongoose.Types.ObjectId }
}): Promise<void> {
  const notif = await Notification.create({
    publicId: uuidv4(),
    ...opts,
  })

  // Push live if the user is connected
  if (_io) {
    _io
      .to(`tenant:${opts.tenantId}:user:${opts.userId}`)
      .emit('notification:new', {
        id:        notif.publicId,
        type:      notif.type,
        message:   notif.message,
        relatedTo: notif.relatedTo,
        read:      false,
        createdAt: notif.createdAt,
      })
  }
}
