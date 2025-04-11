import { Server as NetServer, Socket } from 'net'
import { Server as SocketIOServer } from 'socket.io'
import { NextApiResponse } from 'next'

export type NextApiResponseServerIO = NextApiResponse & {
  socket: Socket & {
    server: NetServer & {
      io: SocketIOServer
    }
  }
} 