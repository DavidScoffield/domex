'use client'

import ClusterContext from '@/context/ClusterContext'
import { socket } from '@/socket'
import { ClusterID, NodeID } from '@/types'
import { useRouter } from 'next/navigation'
import { useCallback, useContext, useEffect } from 'react'
import usePeers from '@/hooks/usePeers'
import useMapReduce from '@/hooks/useMapReduce'

type ClusterAuthProps = {
  nodeName: string
  clusterID?: ClusterID
  creatingCluster: boolean
}

const useCluster = () => {
  const router = useRouter()
  const {
    clusterNodes,
    clusterSession,
    clusterMaster,
    isReadyToExecute,
    setIsReadyToExecute,
    setClusterSession,
  } = useContext(ClusterContext)
  const { destroyPeers } = usePeers()

  const { dispatchMapReduce } = useMapReduce()

  const joinCluster = useCallback((auth: ClusterAuthProps) => {
    socket.auth = auth
    socket.connect()
  }, [])

  const toggleClusterLock = useCallback(
    (lock: boolean) => socket.emit('cluster:toggle-lock', lock),
    [],
  )

  const kickNode = useCallback((nodeID: NodeID) => socket.emit('cluster:kick-node', nodeID), [])

  const leaveCluster = useCallback(
    (kicked = false) => {
      socket.emit('cluster:leave-cluster', kicked)
      sessionStorage.clear()
      socket.disconnect()
      setClusterSession(null)
      destroyPeers()
      router.push('/')
      dispatchMapReduce({ type: 'RESET_READY_TO_EXECUTE' })
    },
    [destroyPeers, dispatchMapReduce, router, setClusterSession],
  )

  // TODO: If this will be used, we need to solve the issue of peers reconnections, or remove this and solve the inconsistency of states when the node refreshes the page while is executing a map-reduce job
  // useEffect(() => {
  //   return () => window.addEventListener('beforeunload', (_) => leaveCluster())
  // }, [leaveCluster])

  return {
    clusterNodes,
    clusterSession,
    joinCluster,
    leaveCluster,
    kickNode,
    clusterMaster,
    isReadyToExecute,
    setIsReadyToExecute,
    toggleClusterLock,
  }
}

export default useCluster
