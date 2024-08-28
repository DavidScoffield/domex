import { type ClusterID, type SessionID, type Session } from '../types.js'

export interface ClusterSessionStore {
  findSession: (clusterID: ClusterID, sessionID: SessionID) => Session | undefined
  findAllSessions: (clusterID: ClusterID) => Session[]
  saveSession: (clusterID: ClusterID, sessionID: SessionID, session: Session) => void
  removeSession: (clusterID: ClusterID, sessionID: SessionID) => void
}
