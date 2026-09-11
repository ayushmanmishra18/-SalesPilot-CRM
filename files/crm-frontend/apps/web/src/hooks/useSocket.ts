import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '../store/auth'
import { toast } from '../components/ui/Toast'

const API_URL = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3001'

let globalSocket: Socket | null = null

export function useSocket() {
  const token       = useAuthStore(s => s.accessToken)
  const queryClient = useQueryClient()
  const socketRef   = useRef<Socket | null>(null)

  useEffect(() => {
    if (!token) return

    // Singleton — don't create multiple connections
    if (globalSocket?.connected) {
      socketRef.current = globalSocket
      return
    }

    const socket = io(API_URL, {
      auth:            { token },
      transports:      ['websocket', 'polling'],
      reconnection:    true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    })

    socket.on('connect', () => {
      console.log('[socket] connected')
    })

    socket.on('disconnect', (reason) => {
      console.log('[socket] disconnected:', reason)
    })

    socket.on('connect_error', (err) => {
      console.warn('[socket] connect error:', err.message)
    })

    // ── Activity:new — invalidate the feed for the relevant record ──
    socket.on('activity:new', (data: { relatedTo: { type: string; id: string } }) => {
      queryClient.invalidateQueries({ queryKey: ['activities', data.relatedTo.id] })
    })

    // ── Deal:moved — invalidate deals list and pipeline ──
    socket.on('deal:moved', () => {
      queryClient.invalidateQueries({ queryKey: ['deals'] })
    })

    // ── Notification:new — invalidate bell + show toast ──
    socket.on('notification:new', (data: { message: string }) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.info(data.message)
    })

    globalSocket = socket
    socketRef.current = socket

    return () => {
      // Don't disconnect on unmount — keep the global connection alive
      // Only disconnect on logout (handled in auth store)
    }
  }, [token])

  // Join a specific record room when viewing deal/contact detail
  function joinRecord(type: 'deal' | 'contact', id: string) {
    socketRef.current?.emit('join:record', { type, id })
  }

  function leaveRecord(type: 'deal' | 'contact', id: string) {
    socketRef.current?.emit('leave:record', { type, id })
  }

  return { socket: socketRef.current, joinRecord, leaveRecord }
}

// Call on logout
export function disconnectSocket() {
  globalSocket?.disconnect()
  globalSocket = null
}
