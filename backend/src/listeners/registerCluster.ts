import { type Server, type Socket } from 'socket.io'
import LoggerService from '../services/logger.services.js'
import { type InMemoryClusterSessionStore } from '../store/InMemorySessionStore.js'
import { type NodeID } from '../types.js'

export const registerCluster = async (
  io: Server,
  socket: Socket,
  clustersSessionStore: InMemoryClusterSessionStore,
): Promise<void> => {
  // persist session
  clustersSessionStore.saveSession(socket.clusterID, socket.sessionID, {
    nodeName: socket.nodeName,
    nodeID: socket.nodeID,
    socketConnected: true,
    isMaster: socket.isMaster,
  })

  // emit session details
  socket.emit('cluster:session', {
    sessionID: socket.sessionID,
    nodeID: socket.nodeID,
    nodeName: socket.nodeName,
    clusterID: socket.clusterID,
    isMaster: socket.isMaster,
  })

  // join the cluster
  await socket.join(socket.clusterID)
  // join the node's own cluster
  await socket.join(socket.nodeID)

  const nodes = clustersSessionStore.findAllSessions(socket.clusterID)
  const nodesWitoutMe = nodes.filter((node) => node.nodeID !== socket.nodeID)
  socket.emit('cluster:nodes', nodesWitoutMe)

  socket.broadcast.to(socket.clusterID).emit(`cluster:node-connected`, {
    nodeID: socket.nodeID,
    nodeName: socket.nodeName,
    isMaster: socket.isMaster,
    socketConnected: true,
  })

  socket.on('cluster:leave-cluster', async (kicked) => {
    LoggerService.socket(
      `${socket.isMaster ? 'Master' : 'Node'} ${socket.nodeName} left the cluster: ${
        socket.clusterID
      }, ${socket.nodeID}`,
    )

    if (socket.isMaster) {
      // if the master leaves the cluster, delete the cluster
      clustersSessionStore.removeCluster(socket.clusterID)
    } else {
      clustersSessionStore.removeSession(socket.clusterID, socket.sessionID)
    }

    if (!kicked)
      socket.broadcast.to(socket.clusterID).emit(`cluster:node-leave`, {
        nodeID: socket.nodeID,
        nodeName: socket.nodeName,
      })

    await socket.leave(socket.clusterID)
    await socket.leave(socket.nodeID)
  })

  socket.on('cluster:kick-node', async (nodeID: NodeID) => {
    LoggerService.socket(
      `Node ${socket.nodeID} kicked node ${nodeID} from cluster ${socket.clusterID}`,
    )
    socket.broadcast.to(socket.clusterID).emit(`cluster:node-kicked`, { nodeID })
    socket.emit(`cluster:node-kicked`, { nodeID })
    clustersSessionStore.kickNode(socket.clusterID, nodeID)
  })

  socket.on('cluster:toggle-lock', async (lock: boolean) => {
    LoggerService.socket(`The cluster ${socket.clusterID} has been ${lock ? 'locked' : 'unlocked'}`)
    clustersSessionStore.toggleClusterLock(socket.clusterID, lock)
  })

  socket.on('disconnect', () => {
    LoggerService.socket(
      `${socket.isMaster ? 'Master' : 'Node'} ${socket.nodeName} disconnected from cluster: ${
        socket.clusterID
      }`,
      socket.id,
    )

    const session = clustersSessionStore.findSession(socket.clusterID, socket.sessionID)
    if (!session) return

    clustersSessionStore.saveSession(socket.clusterID, socket.sessionID, {
      nodeName: socket.nodeName,
      nodeID: socket.nodeID,
      isMaster: socket.isMaster,
      socketConnected: false,
    })

    socket.broadcast.to(socket.clusterID).emit(`cluster:node-disconnected`, {
      nodeID: socket.nodeID,
      nodeName: socket.nodeName,
    })
  })
}
