'use client'

import { type Peers, type ClusterSession, type Node } from '@/types'
import React, { PropsWithChildren, createContext, useMemo, useState } from 'react'

export type ClusterContextType = {
  clusterNodes: Node[]
  setClusterNodes: React.Dispatch<React.SetStateAction<Node[]>>
  clusterSession: ClusterSession | null
  setClusterSession: React.Dispatch<React.SetStateAction<ClusterSession | null>>
  peers: Peers
  setPeers: React.Dispatch<React.SetStateAction<Peers>>
  clusterMaster: Node | null
  isReadyToExecute: boolean
  setIsReadyToExecute: React.Dispatch<React.SetStateAction<boolean>>
}

const ClusterContext = createContext<ClusterContextType>({
  clusterNodes: [],
  setClusterNodes: () => {},
  clusterSession: null,
  setClusterSession: () => {},
  peers: {},
  setPeers: () => {},
  clusterMaster: null,
  isReadyToExecute: false,
  setIsReadyToExecute: () => {},
})

export const ClusterProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [clusterNodes, setClusterNodes] = useState<Node[]>([])
  const [clusterSession, setClusterSession] = useState<ClusterSession | null>(null)
  const [peers, setPeers] = useState<Peers>({})
  const [isReadyToExecute, setIsReadyToExecute] = useState(false)

  const clusterMaster = useMemo(
    () => clusterNodes.find((node) => node.isMaster) || null,
    [clusterNodes],
  )

  return (
    <ClusterContext.Provider
      value={{
        clusterNodes,
        setClusterNodes,
        clusterSession,
        setClusterSession,
        peers,
        setPeers,
        clusterMaster,
        isReadyToExecute,
        setIsReadyToExecute,
      }}>
      {children}
    </ClusterContext.Provider>
  )
}

export default ClusterContext
