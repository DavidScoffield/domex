import { type Server, type Socket } from 'socket.io'
import { type ClusterSessionStore } from '../store/ClusterSessionStore.js'
import { type ReturningSignalParams, type SendingSignalParams } from '../types.js'

export default function registerWebRTC(
  io: Server,
  socket: Socket,
  clustersSessionStore: ClusterSessionStore,
): void {
  socket.on('webrtc:sending-signal', ({ nodeToSignal, signal, callerID }: SendingSignalParams) => {
    io.to(nodeToSignal).emit('webrtc:node-joined', {
      signal,
      callerID,
    })
  })

  socket.on('webrtc:returning-signal', ({ callerID, signal }: ReturningSignalParams) => {
    io.to(callerID).emit('webrtc:receiving-returned-signal', {
      signal,
      nodeID: socket.nodeID,
    })
  })
}
