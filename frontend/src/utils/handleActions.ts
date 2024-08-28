import { Action, actionTypes } from '@/context/MapReduceContext'
import { Node } from '@/types'

export function handleActionSignal({
  action,
  setClusterNodes,
}: {
  action: Action
  setClusterNodes: React.Dispatch<React.SetStateAction<Node[]>>
}) {
  switch (action.type) {
    case actionTypes.SET_READY_TO_EXECUTE:
      setClusterNodes((clusterNodes) =>
        clusterNodes.map((node) => {
          if (node.nodeID === action.nodeID) {
            return { ...node, readyToExecuteMap: action.payload }
          }
          return node
        }),
      )
      break

    case actionTypes.SET_EXECUTION_STATUS:
      setClusterNodes((clusterNodes) =>
        clusterNodes.map((node) => {
          if (node.nodeID === action.nodeID) {
            return { ...node, executionStatus: action.payload }
          }
          return node
        }),
      )
      break
  }
}
