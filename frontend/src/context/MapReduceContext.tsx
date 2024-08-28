'use client'

import { placeholdersFunctions } from '@/constants/functionCodes'
import useCluster from '@/hooks/useCluster'
import { Code, KeyValuesCount, Output, ReducerState, Sizes, Tree, NodeID } from '@/types'
import { average } from '@/utils/helpers'
import { createContext, useReducer } from 'react'

export type MapReduceContextType = {
  mapReduceState: ReducerState
  dispatchMapReduce: React.Dispatch<Action>
  MapReduceJobCode: string
}

export const actionTypes = {
  SET_CODES: 'SET_CODES',
  MAP_COMBINE_EJECUTADO: 'MAP_COMBINE_EJECUTADO',
  EJECUTAR_REDUCE: 'EJECUTAR_REDUCE',
  RECIBIR_CLAVES: 'RECIBIR_CLAVES',
  RESULTADO_FINAL: 'RESULTADO_FINAL',
  SET_READY_TO_EXECUTE: 'SET_READY_TO_EXECUTE',
  UPDATE_FILES: 'UPDATE_FILES',
  DELETE_FILE: 'DELETE_FILE',
  ADD_FILES: 'ADD_FILES',
  SET_STDERR: 'SET_STDERR',
  SET_STDOUT: 'SET_STDOUT',
  MAP_EXECUTED: 'MAP_EXECUTED',
  RESET_READY_TO_EXECUTE: 'RESET_READY_TO_EXECUTE',
  SET_EXECUTION_STATUS: 'SET_EXECUTION_STATUS',
} as const

export type Action = {
  nodeID?: NodeID
  nodeName?: string
  payloadSize?: number
} & (
  | { type: 'SET_CODES'; payload: ReducerState['code'] }
  | {
      type: 'MAP_COMBINE_EJECUTADO'
      payload: {
        combineResults: KeyValuesCount
        mapResults: KeyValuesCount
      }
    }
  | {
      type: 'EJECUTAR_REDUCE'
      payload: {
        reduceKeys: ReducerState['reduceKeys']
        sendKeys: ReducerState['sendKeys']
        receiveKeysFrom: ReducerState['receiveKeysFrom']
      }
    }
  | {
      type: 'RECIBIR_CLAVES'
      payload: {
        [key: string]: unknown[]
      }
    }
  | {
      type: 'RESULTADO_FINAL'
      payload: {
        sizes: Sizes
        incrementReducerNodes: boolean
        reduceResult: ReducerState['reduceResult']
      }
    }
  | { type: 'SET_READY_TO_EXECUTE'; payload: boolean }
  | {
      type: 'UPDATE_FILES'
      payload: { fileNames: string[] }
    }
  | {
      type: 'DELETE_FILE'
      payload: Tree
    }
  | {
      type: 'ADD_FILES'
      payload: File[]
    }
  | {
      type: 'SET_STDERR'
      payload: Code
    }
  | {
      type: 'SET_STDOUT'
      payload: string
    }
  | { type: 'MAP_EXECUTED' }
  | { type: 'RESET_READY_TO_EXECUTE' }
  | {
      type: 'SET_EXECUTION_STATUS'
      payload: string
    }
  | {
      type: 'FILE_NAME'
      payload: {
        uuid: string
        name: string
      }
    }
)

export const initialSizes: Sizes = {
  inputFiles: 0,
  mapInput: 0,
  mapOutput: 0,
  mapCount: 0,
  combineOutput: 0,
  combineCount: 0,
  totalKeysSent: 0,
  totalValuesSent: 0,
  totalBytesSent: 0,
  totalKeysReceived: 0,
  totalValuesReceived: 0,
  totalBytesReceived: 0,
  reduceInput: 0,
  reduceOutput: 0,
  reduceCount: 0,
  mapTime: 0,
  reduceTime: 0,
  combineTime: 0,
}

const initialTimeStatistics: ReducerState['timeStatistics'] = {
  mapTimes: [],
  combineTimes: [],
  reduceTimes: [],
  avgMapTime: 0,
  maxMapTime: 0,
  minMapTime: 0,
  avgCombineTime: 0,
  maxCombineTime: 0,
  minCombineTime: 0,
  avgReduceTime: 0,
  maxReduceTime: 0,
  minReduceTime: 0,
  totalTime: 0,
}

export const initialOutput: Output = {
  stderr: {
    mapCode: '',
    combineCode: '',
    reduceCode: '',
  },
  stdout: '',
}

const initialState: ReducerState = {
  code: {
    mapCode: placeholdersFunctions.map.code,
    combineCode: placeholdersFunctions.combine.code,
    reduceCode: placeholdersFunctions.reduce.code,
  },
  combineResults: {},
  mapResults: {},
  reduceKeys: {},
  sendKeys: null,
  clavesRecibidas: {},
  receiveKeysFrom: null,
  reduceResult: {},
  sizes: initialSizes,
  timeStatistics: initialTimeStatistics,
  mapNodesCount: 0,
  finishedMapNodes: 0,
  finishedCombineNodes: 0,
  finishedReducerNodes: 0,
  output: initialOutput,
  errors: '',
  resetState: -1,
  resetReadyToExecute: -1,
  totalNodes: 0,
  finishedNodes: 0,
}

const MapReduceContext = createContext<MapReduceContextType>({
  mapReduceState: initialState,
  dispatchMapReduce: () => {},
  MapReduceJobCode: '',
})

const reducer = (state: ReducerState, action: Action) => {
  const nodeID = action.nodeID as NodeID
  switch (action.type) {
    case actionTypes.RESET_READY_TO_EXECUTE:
      return {
        ...initialState,
        code: state.code,
        resetState: state.resetState,
        resetReadyToExecute: state.resetReadyToExecute + 1,
      }
    case actionTypes.SET_CODES:
      return {
        ...initialState,
        code: action.payload,
        resetReadyToExecute: state.resetReadyToExecute,
        resetState: state.resetState + 1,
      }
    case actionTypes.MAP_COMBINE_EJECUTADO:
      return {
        ...state,
        combineResults: {
          ...state.combineResults,
          [nodeID]: action.payload.combineResults,
        },
        mapResults: {
          ...state.mapResults,
          [nodeID]: action.payload.mapResults,
        },
      }
    case actionTypes.EJECUTAR_REDUCE:
      const { reduceKeys, sendKeys, receiveKeysFrom } = action.payload
      return {
        ...state,
        reduceKeys,
        sendKeys,
        receiveKeysFrom,
      }
    case actionTypes.RECIBIR_CLAVES:
      return {
        ...state,
        sizes: {
          ...state.sizes,
          totalBytesReceived: state.sizes.totalBytesReceived + action.payloadSize,
        },
        clavesRecibidas: {
          ...state.clavesRecibidas,
          [nodeID]: action.payload,
        },
      }
    case actionTypes.RESULTADO_FINAL:
      const {
        sizes,
        timeStatistics,
        totalNodes,
        finishedNodes,
        finishedReducerNodes,
        mapNodesCount,
        reduceResult,
      } = state

      const {
        sizes: newSizes,
        incrementReducerNodes,
        reduceResult: newReduceResult,
      } = action.payload

      const currentSizes = { ...sizes }
      for (const key in newSizes) {
        currentSizes[key as keyof Sizes] += newSizes[key as keyof Sizes]
      }

      let newMapTimes = [...timeStatistics.mapTimes]
      let newCombineTimes = [...timeStatistics.combineTimes]
      let newReduceTimes = [...timeStatistics.reduceTimes]

      if (newSizes.inputFiles) {
        newMapTimes = [...newMapTimes, newSizes.mapTime]
        newCombineTimes = [...newCombineTimes, newSizes.combineTime]
      }

      if (incrementReducerNodes) {
        newReduceTimes = [...newReduceTimes, newSizes.reduceTime]
      }

      let newTimeStatistics = {
        ...timeStatistics,
        mapTimes: newMapTimes,
        combineTimes: newCombineTimes,
        reduceTimes: newReduceTimes,
      }

      if (finishedNodes + 1 === totalNodes) {
        newTimeStatistics = {
          ...newTimeStatistics,

          avgMapTime: average(newMapTimes),
          maxMapTime: Math.max(...newMapTimes),
          minMapTime: Math.min(...newMapTimes),

          avgCombineTime: average(newCombineTimes),
          maxCombineTime: Math.max(...newCombineTimes),
          minCombineTime: Math.min(...newCombineTimes),

          avgReduceTime: average(newReduceTimes),
          maxReduceTime: Math.max(...newReduceTimes),
          minReduceTime: Math.min(...newReduceTimes),
        }

        newTimeStatistics.totalTime =
          newTimeStatistics.avgMapTime +
          newTimeStatistics.avgCombineTime +
          newTimeStatistics.avgReduceTime
      }

      return {
        ...state,
        sizes: currentSizes,
        timeStatistics: newTimeStatistics,
        reduceResult: { ...reduceResult, ...newReduceResult },
        mapNodesCount: newSizes.inputFiles ? mapNodesCount + 1 : mapNodesCount,
        finishedNodes: finishedNodes + 1,
        finishedReducerNodes: incrementReducerNodes
          ? finishedReducerNodes + 1
          : finishedReducerNodes,
      }
    case actionTypes.SET_STDOUT:
      const incomingStdout = action.payload.trim()

      if (!incomingStdout) return state

      const stdout =
        incomingStdout
          .split('\n') // Split the stdout into lines
          .map((line) => line.trim()) // Remove leading/trailing whitespace from each line
          .filter((line) => line) // Remove empty lines (lines that are just whitespace
          .map((line) => (action.nodeName ? `Node ${action.nodeName}: ${line}` : line)) // Add the nodename to each line
          .join('\n') + '\n' // Join the lines back together and add a newline at the end

      const newStdoutState = state.output.stdout + stdout

      return {
        ...state,
        finishedMapNodes:
          newStdoutState.match(/MAP EJECUTADO SATISFACTORIAMENTE/g)?.length ||
          state.finishedMapNodes,
        finishedCombineNodes:
          newStdoutState.match(/COMBINE EJECUTADO SATISFACTORIAMENTE/g)?.length ||
          state.finishedCombineNodes,
        output: {
          ...state.output,
          stdout: newStdoutState,
        },
      }
    case actionTypes.SET_STDERR:
      let errors = Object.values(action.payload).join('\n').trim()

      const newState = errors ? initialState : state

      let stderr = action.payload

      if (action.nodeName) {
        if (errors) {
          const newError = `Node ${action.nodeName}: ${errors}\n`
          errors = state.errors + newError
          const detectedError = Object.keys(action.payload).find(
            (code) => !!action.payload[code as keyof Code],
          ) as keyof Code
          stderr = {
            ...state.output.stderr,
            [detectedError]: state.output.stderr[detectedError] + newError,
          }
        } else {
          stderr = state.output.stderr
          errors = state.errors
        }
      }

      return {
        ...newState,
        resetState: state.resetState,
        resetReadyToExecute: state.resetReadyToExecute + (errors ? 1 : 0),
        code: state.code,
        output: {
          ...state.output,
          stderr,
        },
        errors,
      }
    case actionTypes.MAP_EXECUTED:
      return {
        ...state,
        finishedMapNodes: state.finishedMapNodes + 1,
      }
    default:
      return state
  }
}

interface MapReduceProviderProps {
  children: React.ReactNode
  MapReduceJobCode: string
}

export const MapReduceProvider: React.FC<MapReduceProviderProps> = ({
  children,
  MapReduceJobCode,
}) => {
  const { clusterNodes } = useCluster()
  initialState.totalNodes = clusterNodes.length
  const [mapReduceState, dispatchMapReduce] = useReducer(reducer, initialState)

  return (
    <MapReduceContext.Provider
      value={{
        mapReduceState,
        dispatchMapReduce,
        MapReduceJobCode,
      }}>
      {children}
    </MapReduceContext.Provider>
  )
}

export default MapReduceContext
