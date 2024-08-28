import type http from 'node:http'
import type https from 'node:https'
import { Server, type Socket } from 'socket.io'
import { registerCluster } from '../listeners/registerCluster.js'
import registerWebRTC from '../listeners/registerWebRTC.js'
import LoggerService from '../services/logger.services.js'
import { InMemoryClusterSessionStore } from '../store/InMemorySessionStore.js'
import { type ClusterID, type SessionID, type NodeID } from '../types.js'
import { generateRandomClusterId, generateRandomUUID } from '../utils/helpers.js'

// Extend the interface
declare module 'socket.io' {
  interface Socket {
    nodeID: NodeID
    sessionID: SessionID
    clusterID: ClusterID
    nodeName: string
    isMaster: boolean
  }
}

export const createIOServer = (server: http.Server | https.Server): Server => {
  // Socket.io
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
      // credentials: true,
    },
  })

  const clustersSessionStore = new InMemoryClusterSessionStore()

  io.use((socket, next) => {
    const sessionID = socket.handshake.auth.sessionID as SessionID
    const clusterID = socket.handshake.auth.clusterID as ClusterID
    const creatingCluster = !!socket.handshake.auth.creatingCluster
    const nodeName = socket.handshake.auth.nodeName

    if (!nodeName) {
      return next(new Error('NODENAME_REQUIRED'))
    }

    const existCluster = clustersSessionStore.existsCluster(clusterID)

    // If the cluster exists and the node is trying to create a new cluster with the same ID
    if (creatingCluster && existCluster) {
      return next(new Error('CLUSTERID_EXISTS'))
    }

    // If the cluster does not exist and the node is trying to join a cluster that does not exist
    if (!creatingCluster && !existCluster) {
      return next(new Error('CLUSTERID_NOT_EXISTS'))
    }

    const session = clustersSessionStore.findSession(clusterID, sessionID)

    if (!session && clustersSessionStore.isLocked(clusterID)) {
      return next(new Error('CLUSTER_LOCKED'))
    }

    if (!session && !clustersSessionStore.isUniqueNodeName(clusterID, nodeName)) {
      return next(new Error('NODENAME_EXISTS'))
    }

    socket.sessionID = session ? sessionID : generateRandomUUID()
    socket.clusterID = session ? clusterID : clusterID || generateRandomClusterId()
    socket.nodeID = session?.nodeID ?? generateRandomUUID()
    socket.nodeName = session?.nodeName ?? nodeName
    socket.isMaster = session?.isMaster ?? creatingCluster

    next()
  })

  io.on('connection', async (socket: Socket) => {
    LoggerService.socket('New connection: ' + socket.id)

    await registerCluster(io, socket, clustersSessionStore)
    registerWebRTC(io, socket, clustersSessionStore)
  })

  return io
}
