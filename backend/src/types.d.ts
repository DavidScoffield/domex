import { type UUID } from 'crypto'

export type Session = {
  nodeName: string
  nodeID: NodeID
  socketConnected: boolean
  isMaster: boolean
}

export type ClusterID = `${string & { length: 10 }}`
export type SessionID = UUID
export type NodeID = UUID

export type ClusterSessions = Map<SessionID, Session>

export type Cluster = {
  sessions: ClusterSessions
  locked: boolean
}

export type Clusters = Map<ClusterID, Cluster>

export type ReturningSignalParams = {
  callerID: NodeID
  signal: SignalData
}

export type SendingSignalParams = ReturningSignalParams & {
  nodeToSignal: NodeID
}
