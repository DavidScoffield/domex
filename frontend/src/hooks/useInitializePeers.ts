'use client'

import ClusterContext from '@/context/ClusterContext'
import { socket } from '@/socket'
import { NodeID } from '@/types'
import { useCallback, useContext, useEffect, useRef } from 'react'
import SimplePeer, { SignalData } from 'simple-peer'
import usePeers from './usePeers'
import useMapReduce from './useMapReduce'
import { Action } from '@/context/MapReduceContext'
import { handleActionSignal } from '@/utils/handleActions'
import useFiles from './useFiles'
import { ENVS } from '@/constants/envs'

const CHUNK_SIZE = ENVS.GENERAL.CHUNK_SIZE

const useInitializePeers = () => {
  const { peers, setPeers, setClusterNodes, clusterNodes } = useContext(ClusterContext)
  const { addPeer, deletePeer } = usePeers()
  const { dispatchMapReduce } = useMapReduce()
  const { handleReceivingFiles } = useFiles()

  const fileNamesRef = useRef<{ [uuid: string]: string }>({})
  const fileChunksRef = useRef<{ [uuid: string]: Buffer[] }>({})
  const messageChunksRef = useRef<{ [nodeID: NodeID]: { totalChunks: number; chunks: Buffer[] } }>(
    {},
  )

  useEffect(() => {
    const onWebRTCNodeJoined = (payload: { signal: SignalData; callerID: NodeID }) => {
      const peer = addPeer(payload.signal, payload.callerID)
      setPeers((peers) => ({ ...peers, [payload.callerID]: peer }))
      dispatchMapReduce({ type: 'RESET_READY_TO_EXECUTE' })
    }

    const onWebRTCReceivingReturnedSignal = (payload: { signal: SignalData; nodeID: NodeID }) => {
      const peer = peers[payload.nodeID]
      if (peer) {
        peer.signal(payload.signal)
      }
    }

    socket.on('webrtc:node-joined', onWebRTCNodeJoined)
    socket.on('webrtc:receiving-returned-signal', onWebRTCReceivingReturnedSignal)

    return () => {
      socket.off('webrtc:node-joined', onWebRTCNodeJoined)
      socket.off('webrtc:receiving-returned-signal', onWebRTCReceivingReturnedSignal)
    }
  }, [addPeer, dispatchMapReduce, peers, setPeers])

  const onEventsOfPeer = useCallback(
    (peer: SimplePeer.Instance, nodeID: NodeID) => {
      const handleReceivingData = (nodeID: NodeID) => (data: Buffer) => {
        const headerEndIndex = data.indexOf('}') + 1
        const chunkHeader = JSON.parse(data.subarray(0, headerEndIndex).toString('utf8'))
        const chunkData = data.subarray(headerEndIndex)

        if (chunkHeader.type === 'MSG_CHUNK') {
          if (!messageChunksRef.current[nodeID]) {
            messageChunksRef.current[nodeID] = { totalChunks: chunkHeader.totalChunks, chunks: [] }
          }

          messageChunksRef.current[nodeID].chunks[chunkHeader.chunkIndex] = chunkData

          const { totalChunks, chunks } = messageChunksRef.current[nodeID]
          if (chunks.filter((chunk) => chunk !== undefined).length === totalChunks) {
            const completeMessage = Buffer.concat(chunks)
            delete messageChunksRef.current[nodeID]

            try {
              const decodedData: Action = JSON.parse(completeMessage.toString('utf8'))

              if (decodedData.type === 'FILE_NAME') {
                const { uuid, name } = decodedData.payload
                fileNamesRef.current[uuid] = name
                fileChunksRef.current[uuid] = []
                return
              }

              decodedData['nodeID'] = nodeID
              decodedData['nodeName'] = clusterNodes.find((node) => node.nodeID === nodeID)
                ?.nodeName
              handleActionSignal({ action: decodedData, setClusterNodes })
              dispatchMapReduce(decodedData)
              handleReceivingFiles(decodedData)
            } catch (err) {
              console.error('Error parsing complete message:', err)
            }
          }
        } else if (chunkHeader.type === 'FILE_CHUNK') {
          const { uuid, chunkIndex, totalChunks } = chunkHeader

          if (!fileChunksRef.current[uuid]) {
            fileChunksRef.current[uuid] = []
          }

          fileChunksRef.current[uuid][chunkIndex] = chunkData

          if (
            fileChunksRef.current[uuid].filter((chunk) => chunk !== undefined).length ===
            totalChunks
          ) {
            const completeFileBuffer = Buffer.concat(fileChunksRef.current[uuid])
            const fileName = fileNamesRef.current[uuid]
            const file = new File([completeFileBuffer], fileName)
            const action: Action = { type: 'ADD_FILES', payload: [file] }
            handleReceivingFiles(action)
            delete fileChunksRef.current[uuid]
            delete fileNamesRef.current[uuid]
          }
        } else {
          console.error('Received unknown data type:', chunkHeader.type)
        }
      }

      const handlePeerError = (err: Error) => {
        console.error(err)
      }

      const handlePeerClose = () => {
        console.log('Peer closed')
        peer.destroy()
        deletePeer(nodeID)
        setClusterNodes((clusterNodes) =>
          clusterNodes.map((node) => {
            if (node.nodeID === nodeID) {
              return { ...node, peerConnected: false }
            }
            return node
          }),
        )
      }

      const handlePeerConnect = () => {
        console.log('Peer connected')
        setClusterNodes((clusterNodes) =>
          clusterNodes.map((node) => {
            if (node.nodeID === nodeID) {
              return { ...node, peerConnected: true }
            }
            return node
          }),
        )
      }

      peer.on('connect', handlePeerConnect)
      peer.on('data', handleReceivingData(nodeID))
      peer.on('error', handlePeerError)
      peer.on('close', handlePeerClose)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deletePeer, dispatchMapReduce, handleReceivingFiles, setClusterNodes],
  )

  useEffect(() => {
    // Set up the events for the node peers
    const peersEntries = Object.entries(peers) as [NodeID, SimplePeer.Instance][]

    peersEntries.forEach(([nodeID, peer]) => {
      return onEventsOfPeer(peer, nodeID)
    })

    return () => {
      peersEntries.forEach(([nodeID, peer]) => {
        peer.removeAllListeners()
      })
    }
  }, [onEventsOfPeer, peers])
}

export default useInitializePeers
