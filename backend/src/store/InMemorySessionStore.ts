import {
  type NodeID,
  type ClusterID,
  type Clusters,
  type Session,
  type SessionID,
} from '../types.js'
import { type ClusterSessionStore } from './ClusterSessionStore.js'

export class InMemoryClusterSessionStore implements ClusterSessionStore {
  clusters!: Clusters

  constructor() {
    this.clusters = new Map()
  }

  findSession = (clusterID: ClusterID, sessionID: SessionID): Session | undefined => {
    const cluster = this.clusters.get(clusterID)
    if (!cluster) return undefined
    return cluster.sessions.get(sessionID)
  }

  saveSession = (clusterID: ClusterID, sessionID: SessionID, session: Session): void => {
    const cluster = this.clusters.get(clusterID)
    if (!cluster) {
      const newCluster = { sessions: new Map([[sessionID, session]]), locked: false }
      this.clusters.set(clusterID, newCluster)
    } else {
      cluster.sessions.set(sessionID, session)
    }
  }

  findAllSessions = (clusterID: ClusterID): Session[] => {
    const cluster = this.clusters.get(clusterID)
    if (!cluster) return []
    return [...cluster.sessions.values()]
  }

  removeSession = (clusterID: ClusterID, sessionID: SessionID): void => {
    const cluster = this.clusters.get(clusterID)
    if (!cluster) return
    cluster.sessions.delete(sessionID)
  }

  removeCluster = (clusterID: ClusterID): void => {
    this.clusters.delete(clusterID)
  }

  existsCluster = (clusterID: ClusterID): boolean => {
    return this.clusters.has(clusterID)
  }

  isUniqueNodeName = (clusterID: ClusterID, nodeName: string): boolean => {
    const cluster = this.clusters.get(clusterID)

    if (!cluster) return true

    return ![...cluster.sessions.values()].some((session) => session.nodeName === nodeName)
  }

  kickNode = (clusterID: ClusterID, nodeID: NodeID): void => {
    const cluster = this.clusters.get(clusterID)
    if (!cluster) return
    const sessionID = [...cluster.sessions.entries()].find(
      ([_, session]) => session.nodeID === nodeID,
    )?.[0]
    if (!sessionID) return
    cluster.sessions.delete(sessionID)
  }

  toggleClusterLock = (clusterID: ClusterID, lock: boolean): void => {
    const cluster = this.clusters.get(clusterID)
    if (!cluster) return
    cluster.locked = lock
  }

  isLocked = (clusterID: ClusterID): boolean => !!this.clusters.get(clusterID)?.locked
}
