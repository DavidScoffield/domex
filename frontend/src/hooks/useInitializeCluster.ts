'use client'

import ClusterContext from '@/context/ClusterContext'
import { socket } from '@/socket'
import { Peers, ClusterID, ClusterSession, SessionID, BaseNode, NodeID, Node } from '@/types'
import { usePathname, useRouter } from 'next/navigation'
import { useContext, useEffect } from 'react'
import useInitializePeers from './useInitializePeers'
import usePeers from '@/hooks/usePeers'
import useCluster from '@/hooks/useCluster'
import { toast } from 'sonner'
import useAlertModal from '@/hooks/useAlertModal'
import useMapReduce from '@/hooks/useMapReduce'

const useInitializeCluster = () => {
  useInitializePeers()
  const { clusterNodes, setClusterNodes, setClusterSession, setPeers, clusterMaster } =
    useContext(ClusterContext)
  const { dispatchMapReduce } = useMapReduce()
  const router = useRouter()
  const pathname = usePathname()
  const { deletePeer, createPeer, broadcastMessage } = usePeers()
  const { leaveCluster } = useCluster()
  const { showConfirmAlert } = useAlertModal()

  useEffect(() => {
    const session = sessionStorage.getItem('session')

    if (!session) {
      return router.push('/')
    }

    const parsedSession = JSON.parse(session)
    socket.auth = parsedSession
    socket.connect()

    return () => {
      // TODO: move the session to localStorage and clear the sessionStorage
      socket.disconnect()
    }
  }, [router])

  useEffect(() => {
    const onSession = ({
      sessionID,
      nodeID,
      clusterID,
      nodeName,
      isMaster,
    }: {
      sessionID: SessionID
      nodeID: NodeID
      clusterID: ClusterID
      nodeName: string
      isMaster: boolean
    }) => {
      const session: ClusterSession = { sessionID, clusterID, nodeName, isMaster }
      setClusterSession(session)
      // attach the session ID to the next reconnection attempts
      socket.auth = session
      // store it in the sessionStorage
      sessionStorage.setItem('session', JSON.stringify(session))
      // save the ID of the node
      socket.nodeID = nodeID
      // go to the cluster
      router.push(`/cluster/${clusterID}`)
    }

    const onNodes = (baseNodes: BaseNode[]) => {
      const updatedNodes: Node[] = baseNodes.map((node) => ({
        ...node,
        readyToExecuteMap: false,
        executionStatus: '',
      }))
      setClusterNodes(updatedNodes)

      const peers = baseNodes.reduce<Peers>((peers, node) => {
        const peer = createPeer(node.nodeID, socket.nodeID)
        return { ...peers, [node.nodeID]: peer }
      }, {})

      setPeers(peers)
    }

    const handleMasterLeave = async () => {
      showConfirmAlert({
        title: 'El master abandonó el cluster',
        description: 'Será redirigido a la página principal',
        confirmButtonText: 'De acuerdo',
        onConfirm() {
          leaveCluster()
        },
      })
    }

    const onNodeLeave = ({ nodeID, nodeName }: { nodeID: NodeID; nodeName: string }) => {
      const isMaster = clusterMaster?.nodeID === nodeID

      if (isMaster) {
        return handleMasterLeave()
      }

      // A node has left, remove it from the list
      const node = clusterNodes.find((node) => node.nodeID === nodeID)
      if (node?.readyToExecuteMap) {
        broadcastMessage({ type: 'RESET_READY_TO_EXECUTE' })
      }
      setClusterNodes((prevNodes) => prevNodes.filter((node) => node.nodeID !== nodeID))
      deletePeer(nodeID)

      toast.info(`${nodeName} ha abandonado el cluster`)
    }

    const onNodeDisconnected = ({ nodeID, nodeName }: { nodeID: NodeID; nodeName: string }) => {
      if (socket.nodeID === nodeID) return

      // A node has disconnected, update the connected status
      setClusterNodes((prevNodes) =>
        prevNodes.map((node) => {
          if (node.nodeID === nodeID) {
            return { ...node, socketConnected: false }
          }
          return node
        }),
      )

      toast.error(`${nodeName} se ha desconectado del cluster`)
      // deletePeer(nodeID)
    }

    const onNodeConnected = ({
      nodeID,
      nodeName,
      socketConnected,
      isMaster,
    }: {
      nodeID: NodeID
      nodeName: string
      socketConnected: boolean
      isMaster: boolean
    }) => {
      // If the node is already in the list, update the connected status, otherwise add it to the list
      if (clusterNodes.some((node) => node.nodeID === nodeID)) {
        setClusterNodes((prevNodes) =>
          prevNodes.map((node) => {
            if (node.nodeID === nodeID) {
              return { ...node, socketConnected }
            }
            return node
          }),
        )
        toast.success(`${nodeName} se ha reconectado al cluster`)
      } else {
        toast.success(`${nodeName} se ha unido al cluster`)
        setClusterNodes((prevNodes) => [
          ...prevNodes,
          {
            nodeID,
            nodeName,
            socketConnected,
            isMaster,
            readyToExecuteMap: false,
            executionStatus: '',
          },
        ])
      }
    }

    const onNodeKicked = ({ nodeID }: { nodeID: NodeID }) => {
      if (socket.nodeID === nodeID) {
        toast.error('Has sido expulsado del cluster')
        return leaveCluster(true)
      }

      setClusterNodes((prevNodes) => prevNodes.filter((node) => node.nodeID !== nodeID))
      deletePeer(nodeID)

      const node = clusterNodes.find((node) => node.nodeID === nodeID)
      toast.error(`${node?.nodeName} ha sido expulsado del cluster`)

      if (node?.readyToExecuteMap) dispatchMapReduce({ type: 'RESET_READY_TO_EXECUTE' })
    }

    const onConnectError = (err: Error) => {
      const messages = {
        NODENAME_REQUIRED: 'El nombre del nodo es requerido',
        CLUSTER_LOCKED: 'El cluster está bloqueado',
        CLUSTERID_EXISTS: 'Ya existe un cluster con el mismo identificador',
        CLUSTERID_NOT_EXISTS: 'No existe un cluster con el identificador proporcionado',
        NODENAME_EXISTS: 'Ya existe un nodo con el mismo nombre',
      }

      sessionStorage.removeItem('session')

      toast.error(messages[err.message as keyof typeof messages] || err.message, {
        position: 'top-center',
      })

      pathname !== '/' && router.push('/')
    }

    socket.on('cluster:session', onSession)
    socket.on('cluster:nodes', onNodes)
    socket.on('cluster:node-connected', onNodeConnected)
    socket.on('cluster:node-leave', onNodeLeave)
    socket.on('cluster:node-disconnected', onNodeDisconnected)
    socket.on('cluster:node-kicked', onNodeKicked)
    socket.on('connect_error', onConnectError)

    return () => {
      socket.off('cluster:session', onSession)
      socket.off('cluster:nodes', onNodes)
      socket.off('cluster:node-connected', onNodeConnected)
      socket.off('cluster:node-leave', onNodeLeave)
      socket.off('cluster:node-disconnected', onNodeDisconnected)
      socket.off('cluster:node-kicked', onNodeKicked)
      socket.off('connect_error', onConnectError)
    }
  }, [
    clusterNodes,
    createPeer,
    deletePeer,
    leaveCluster,
    pathname,
    clusterMaster?.nodeID,
    router,
    setClusterNodes,
    setPeers,
    setClusterSession,
    broadcastMessage,
    showConfirmAlert,
    dispatchMapReduce,
  ])
}

export default useInitializeCluster
