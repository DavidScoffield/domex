'use client'

import { placeholdersFunctions } from '@/constants/functionCodes'
import { Code, KeyValuesCount, Output, ReducerState, Sizes, UserID } from '@/types'
import { PropsWithChildren, createContext, useReducer } from 'react'

export type MapReduceContextType = {
  mapReduceState: ReducerState
  dispatchMapReduce: React.Dispatch<Action>
}

export const actionTypes = {
  SET_CODES: 'SET_CODES',
  MAP_COMBINER_EJECUTADO: 'MAP_COMBINER_EJECUTADO',
  EJECUTAR_REDUCE: 'EJECUTAR_REDUCE',
  RECIBIR_CLAVES: 'RECIBIR_CLAVES',
  RESULTADO_FINAL: 'RESULTADO_FINAL',
  READY_TO_EXECUTE: 'READY_TO_EXECUTE',
  UPDATE_FILES: 'UPDATE_FILES',
  SET_OUTPUT: 'SET_OUTPUT',
} as const

export type Action = {
  userID?: UserID
  userName?: string
  payloadSize?: number
} & (
  | { type: 'SET_CODES'; payload: ReducerState['code'] }
  | {
      type: 'MAP_COMBINER_EJECUTADO'
      payload: {
        combinerResults: KeyValuesCount
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
      payload: { sizes: Sizes; reduceResult: ReducerState['reduceResult'] }
    }
  | { type: 'READY_TO_EXECUTE' }
  | {
      type: 'UPDATE_FILES'
      payload: { fileNames: string[] }
    }
  | {
      type: 'SET_OUTPUT'
      payload: Output
    }
)

export const initialSizes: Sizes = {
  inputFiles: 0,
  mapInput: 0,
  mapOutput: 0,
  combinerOutput: 0,
  totalKeysSent: 0,
  totalValuesSent: 0,
  totalBytesSent: 0,
  totalKeysReceived: 0,
  totalValuesReceived: 0,
  totalBytesReceived: 0,
  reduceInput: 0,
  reduceOutput: 0,
}

export const initialOutput: Output = {
  stderr: {
    mapCode: '',
    combinerCode: '',
    reduceCode: '',
  },
  stdout: '',
}

const initialState: ReducerState = {
  code: {
    mapCode: placeholdersFunctions.map.code,
    combinerCode: placeholdersFunctions.combiner.code,
    reduceCode: placeholdersFunctions.reduce.code,
  },
  combinerResults: {},
  mapResults: {},
  reduceKeys: {},
  sendKeys: null,
  clavesRecibidas: {},
  receiveKeysFrom: null,
  reduceResult: {},
  sizes: initialSizes,
  mapNodesCount: 0,
  output: initialOutput,
  errors: '',
  resetState: -1,
  finishedNodes: 0,
}

const MapReduceContext = createContext<MapReduceContextType>({
  mapReduceState: initialState,
  dispatchMapReduce: () => {},
})

const reducer = (state: ReducerState, action: Action) => {
  const userID = action.userID as UserID
  switch (action.type) {
    case actionTypes.SET_CODES:
      return {
        ...initialState,
        code: action.payload,
        resetState: state.resetState + 1,
      }
    case actionTypes.MAP_COMBINER_EJECUTADO:
      return {
        ...state,
        combinerResults: {
          ...state.combinerResults,
          [userID]: action.payload.combinerResults,
        },
        mapResults: {
          ...state.mapResults,
          [userID]: action.payload.mapResults,
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
          [userID]: action.payload,
        },
      }
    case actionTypes.RESULTADO_FINAL:
      const currentSizes = { ...state.sizes }
      const newSizes = { ...action.payload.sizes }
      for (const key in newSizes) {
        currentSizes[key as keyof Sizes] += newSizes[key as keyof Sizes]
      }
      const newReduceResult = {
        ...state.reduceResult,
        ...action.payload.reduceResult,
      }
      return {
        ...state,
        reduceResult: newReduceResult,
        sizes: currentSizes,
        mapNodesCount: newSizes.inputFiles ? state.mapNodesCount + 1 : state.mapNodesCount,
        finishedNodes: state.finishedNodes + 1,
      }
    case actionTypes.READY_TO_EXECUTE:
      return state
    case actionTypes.SET_OUTPUT:
      let errors = Object.values(action.payload.stderr).join('\n').trim()

      const newState = errors ? initialState : state

      let stdout = action.payload.stdout
      let stderr = action.payload.stderr

      if (action.userName) {
        stdout = `Node ${action.userName}: ${stdout}\n`

        if (errors) {
          const newError = `Node ${action.userName}: ${errors}\n`
          errors = state.errors + newError
          const detectedError = Object.keys(action.payload.stderr).find(
            (code) => !!action.payload.stderr[code as keyof Code],
          ) as keyof Code
          stderr = {
            ...state.output.stderr,
            [detectedError]: state.output.stderr[detectedError] + newError,
          }
        }
      }

      return {
        ...newState,
        output: {
          stdout,
          stderr,
        },
        errors,
      }
    default:
      return state
  }
}

export const MapReduceProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [mapReduceState, dispatchMapReduce] = useReducer(reducer, initialState)

  return (
    <MapReduceContext.Provider
      value={{
        mapReduceState,
        dispatchMapReduce,
      }}>
      {children}
    </MapReduceContext.Provider>
  )
}

export default MapReduceContext
