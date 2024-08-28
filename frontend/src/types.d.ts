import { type UUID } from 'crypto'
import type SimplePeer from 'simple-peer'

// Extend the interface
declare module 'socket.io-client' {
  interface Socket {
    nodeID: NodeID
  }
}

export type ClusterSession = {
  sessionID: SessionID
  clusterID: ClusterID
  nodeName: string
  isMaster: boolean
}

export type BaseNode = {
  nodeID: NodeID
  nodeName: string
  socketConnected: boolean
  peerConnected?: boolean
  isMaster: boolean
}

export type Node = BaseNode & {
  readyToExecuteMap: boolean
  executionStatus: string
}

export type Peers = {
  [nodeID: NodeID]: SimplePeer.Instance
}

export type ClusterID = `${string & { length: 10 }}`
export type SessionID = UUID
export type NodeID = UUID

export type Code = {
  mapCode: string
  combineCode: string
  reduceCode: string
}

export type Output = {
  stderr: Code
  stdout: string
}

export type ReducerState = {
  code: Code
  combineResults: NodeResults
  mapResults: NodeResults
  reduceKeys: KeyValuesCount
  reduceResult: KeyValue
  sizes: Sizes
  timeStatistics: {
    mapTimes: number[]
    combineTimes: number[]
    reduceTimes: number[]
    avgMapTime: number
    maxMapTime: number
    minMapTime: number
    avgCombineTime: number
    maxCombineTime: number
    minCombineTime: number
    avgReduceTime: number
    maxReduceTime: number
    minReduceTime: number
    totalTime: number
  }
  clavesRecibidas: { [node: NodeID]: { [innerKey: string]: unknown[] } }
  receiveKeysFrom: NodeID[] | null
  sendKeys: null | {
    [nodeToSendKeys: NodeID]: string[]
  }
  mapNodesCount: int
  finishedMapNodes: int
  finishedCombineNodes: int
  finishedReducerNodes: int
  output: Output
  errors: string
  resetState: int
  resetReadyToExecute: int
  totalNodes: int
  finishedNodes: int
}

export type KeyValuesCount = {
  [innerKey: string]: number
}

export type NodeResults = {
  [node: NodeID]: KeyValuesCount
}

export type KeyValues = {
  [key: string]: unknown[]
}

export type KeyValue = {
  [key: string]: unknown
}

export type MapCombineResults = {
  mapResults: KeyValues
  combineResults: KeyValues
}

export type Sizes = {
  inputFiles: int
  mapInput: int
  mapOutput: int
  mapCount: int
  combineOutput: int
  combineCount: int
  totalKeysSent: int
  totalValuesSent: int
  totalBytesSent: int
  totalKeysReceived: int
  totalValuesReceived: int
  totalBytesReceived: int
  reduceInput: int
  reduceOutput: int
  reduceCount: int
  mapTime: int
  combineTime: int
  reduceTime: int
}

export type FinalResults = {
  mapTotalCount: KeyValuesCount
  combineTotalCount: KeyValuesCount
  sizes: Sizes
  mapNodesCount?: int
  reducerNodesCount?: int
}

export type Statistics = {
  title: string
  data: { label: string; value: string | number }[]
}

export type Tree = {
  isFolder: boolean
  isLocal?: boolean
  name: string
  ownerId: NodeID
  items?: Tree[]
}
