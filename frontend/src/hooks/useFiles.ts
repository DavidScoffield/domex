import FilesContext from '@/context/FilesContext'
import { Action, actionTypes } from '@/context/MapReduceContext'
import { Tree, NodeID } from '@/types'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import usePeers from './usePeers'
import useCluster from './useCluster'
import { socket } from '@/socket'

const useFiles = (loading: boolean = false) => {
  const { selectedFiles, setSelectedFiles, nodesFiles, setNodesFiles } = useContext(FilesContext)
  const { broadcastMessage, sendFile } = usePeers()
  const { clusterNodes, clusterSession } = useCluster()

  const ownFileTree: Tree = useMemo(
    () => ({
      name: '/ (local)',
      isFolder: true,
      isLocal: true,
      ownerId: socket.nodeID,
      items: selectedFiles.map((file) => {
        return {
          isLocal: true,
          name: file.name,
          isFolder: false,
          ownerId: socket.nodeID,
        }
      }),
    }),
    [selectedFiles],
  )

  const nodesFileTree: Tree[] = useMemo(
    () => [
      ...Object.entries(nodesFiles).map(([nodeID, fileNames]) => {
        const nodename = clusterNodes.find((node) => node.nodeID === nodeID)?.nodeName

        return {
          name: `/ ${nodename} (remote)`,
          isFolder: true,
          ownerId: nodeID as NodeID,
          items: fileNames.map((file) => {
            return {
              name: file,
              isFolder: false,
              ownerId: nodeID as NodeID,
            }
          }),
        }
      }),
    ],
    [clusterNodes, nodesFiles],
  )

  const nodeHasFiles = !!ownFileTree.items?.length

  const fileTrees = useMemo(
    () => (!clusterSession?.isMaster ? [ownFileTree, ...nodesFileTree] : [...nodesFileTree]),
    [nodesFileTree, ownFileTree, clusterSession?.isMaster],
  )

  const [mapNodesCount, setMapNodesCount] = useState(0)

  useEffect(() => {
    setMapNodesCount((mapNodesCount) =>
      loading ? fileTrees.filter((filteTree) => filteTree.items?.length).length : mapNodesCount,
    )
  }, [fileTrees, loading])

  useEffect(() => {
    if (clusterSession?.isMaster) return

    // Broadcast own files to all peers
    const fileNames = selectedFiles.map((file) => file.name)
    broadcastMessage({ type: 'UPDATE_FILES', payload: { fileNames } })
  }, [broadcastMessage, clusterSession?.isMaster, selectedFiles])

  useEffect(() => {
    if (!clusterSession) setSelectedFiles([])
  }, [clusterSession, setSelectedFiles])

  useEffect(() => {
    // Remove files from nodes that are no longer in the cluster, or are disconnected
    setNodesFiles((prevFiles) => {
      const newFiles = { ...prevFiles }
      const nodeNodeIDs = Object.keys(prevFiles) as NodeID[]

      nodeNodeIDs.forEach((nodeID) => {
        const nodeInCluster = clusterNodes.find((node) => node.nodeID === nodeID)
        const nodeConnected = nodeInCluster?.socketConnected

        if (!nodeInCluster || !nodeConnected) {
          delete newFiles[nodeID]
        }
      })

      return newFiles
    })
  }, [clusterNodes, setNodesFiles])

  const deleteFile = (tree: Tree) => {
    setSelectedFiles((prevFiles) => prevFiles.filter((file) => file.name !== tree.name))
  }

  const addFilesFromSlave = useCallback(
    (files: File[]) => {
      setSelectedFiles((prevFiles) => {
        const uniqueFiles = files.filter(
          (newFile) => !prevFiles.some((oldFile) => oldFile.name === newFile.name),
        )
        return [...prevFiles, ...uniqueFiles]
      })
    },
    [setSelectedFiles],
  )

  const addFilesFromMaster = async (files: File[], nodeID: NodeID) => {
    for (const file of files) {
      sendFile(nodeID, file)
    }
  }

  const handleReceivingFiles = useCallback(
    (action: Action) => {
      switch (action.type) {
        case actionTypes.UPDATE_FILES:
          setNodesFiles((prevFiles) => {
            return { ...prevFiles, [action.nodeID as NodeID]: action.payload.fileNames }
          })
          break

        case actionTypes.DELETE_FILE:
          const target = action.payload

          const deletedFileNames = target.items?.map((item) => item.name) ?? [target.name]
          setSelectedFiles((prevFiles) =>
            prevFiles.filter((file) => !deletedFileNames.includes(file.name)),
          )
          break

        case actionTypes.ADD_FILES:
          addFilesFromSlave(action.payload)
      }
    },
    [addFilesFromSlave, setNodesFiles, setSelectedFiles],
  )

  return {
    selectedFiles,
    fileTrees,
    mapNodesCount,
    deleteFile,
    addFilesFromMaster,
    addFilesFromSlave,
    handleReceivingFiles,
    nodeHasFiles,
  }
}

export default useFiles
