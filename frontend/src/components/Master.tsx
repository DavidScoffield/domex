'use client'

import { Button } from '@mui/material'
import Output from '@/components/Output'
import Results from '@/components/Results'
import { Statistics } from '@/components/Statistics'
import { FolderList } from '@/components/ui/FolderTree'
import { placeholdersFunctions } from '@/constants/functionCodes'
import { Action, initialSizes } from '@/context/MapReduceContext'
import useFiles from '@/hooks/useFiles'
import useMapReduce from '@/hooks/useMapReduce'
import usePeers from '@/hooks/usePeers'
import { usePythonCodeValidator } from '@/hooks/usePythonCodeValidator'
import useCluster from '@/hooks/useCluster'
import useStatistics from '@/hooks/useStatisticts'
import { FinalResults, KeyValuesCount, ReducerState, Tree, NodeID, NodeResults } from '@/types'
import { LoadingButton } from '@mui/lab'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import BasicAccordion from './Accordion'
import Navbar from './Navbar'
import NodeList from './NodeList'

const WordCountCode = {
  map: `def fmap(value):
  words = value.split()
  for w in words:
    write(w, 1)
  `,
  combine: `def fcomb(key, values):
  write(key, sum(values))
  `,
  reduce: `def fred(key, values):
  write(key, sum(values))
  `,
}

const initialFinalResults: FinalResults = {
  mapTotalCount: {},
  combineTotalCount: {},
  sizes: initialSizes,
  mapNodesCount: 0,
  reducerNodesCount: 0,
}

export default function Master() {
  const { clusterNodes, clusterSession, toggleClusterLock } = useCluster()
  const { mapReduceState, dispatchMapReduce } = useMapReduce()
  const { sendDirectMessage, broadcastMessage } = usePeers()
  const [allNodesReady, setAllNodesReady] = useState(false)
  const [finalResults, setFinalResults] = useState<FinalResults>(initialFinalResults)
  const [isLoading, setIsLoading] = useState(false)
  const [finished, setFinished] = useState(false)
  const { fileTrees, mapNodesCount } = useFiles(isLoading)

  const loading = isLoading && !finished && !mapReduceState.errors

  const [code, setCode] = useState({
    mapCode: WordCountCode.map,
    combineCode: WordCountCode.combine,
    reduceCode: WordCountCode.reduce,
  })

  const statistics = useStatistics(finalResults)

  const { isValidPythonCode, isReady } = usePythonCodeValidator()

  const resetState = () => {
    setFinished(false)
    setFinalResults(initialFinalResults)
  }

  const getTotalCounts = (totalCounts: KeyValuesCount, result: NodeResults) =>
    Object.values(result).forEach((keyList) => {
      Object.entries(keyList).forEach(([key, count]) => {
        totalCounts[key] = (totalCounts[key] || 0) + count
      })
    })

  useEffect(() => {
    if (mapReduceState.resetState < 0) return
    resetState()
  }, [mapReduceState.resetState])

  useEffect(() => {
    if (mapReduceState.resetReadyToExecute <= 0) return
    setIsLoading(false)
    toggleClusterLock(false)
  }, [mapReduceState.resetReadyToExecute, toggleClusterLock])

  useEffect(
    () =>
      setFinished(clusterNodes.length > 0 && mapReduceState.finishedNodes === clusterNodes.length),
    [clusterNodes.length, mapReduceState.finishedNodes],
  )

  useEffect(() => {
    if (!finished) return

    setIsLoading(false)
    toggleClusterLock(false)
  }, [finished, toggleClusterLock])

  const handleIniciarProcesamiento = async () => {
    if (!isReady) return
    if (!allNodesReady) return

    const isValidPythonCodePromise = isValidPythonCode(code)

    toast.promise(isValidPythonCodePromise, {
      position: 'bottom-center',
      loading: 'Validando la sintáxis del código...',
      success: () => {
        return 'Sintáxis del código validada correctamente... iniciando el procesamiento '
      },
      error: 'La sintáxis del código no es válida',
    })

    if (!(await isValidPythonCodePromise)) return

    toggleClusterLock(true)
    resetState()
    const action: Action = { type: 'SET_CODES', payload: code }
    broadcastMessage(action)
    dispatchMapReduce(action)
    setIsLoading(true)
  }

  useEffect(() => {
    const totalNodes = clusterNodes.length
    const readyNodes = clusterNodes.filter((node) => node.readyToExecuteMap).length
    setAllNodesReady(totalNodes > 0 && totalNodes === readyNodes)
  }, [clusterNodes])

  useEffect(() => {
    // If all the combine results are in, then we can start the reduce phase. Check if isn´t finished yet
    if (finished || !isLoading) return
    if (!Object.keys(mapReduceState.combineResults).length) return
    if (Object.keys(mapReduceState.combineResults).length < clusterNodes.length) return

    // Count the total of each key for all the map results
    const mapTotalCount: KeyValuesCount = {}
    getTotalCounts(mapTotalCount, mapReduceState.mapResults)

    // Count the total of each key for all the combine results
    const combineTotalCount: KeyValuesCount = {}
    getTotalCounts(combineTotalCount, mapReduceState.combineResults)

    const nodes = Object.keys(mapReduceState.combineResults) as NodeID[]
    const keys = Object.keys(combineTotalCount)
    const keysPerNode = Math.ceil(keys.length / clusterNodes.length)
    // nodeKeys is an object that contains the keys that each node will reduce
    const nodeKeys: { [key: NodeID]: ReducerState['reduceKeys'] } = {} //TODO: check if string is the correct type, can be a serializable type
    nodes.forEach((node) => {
      nodeKeys[node] = {}
    })
    let nodeIndex = 0

    // Divide the keys between the nodes
    for (let i = 0; i < keys.length; i += keysPerNode) {
      nodeKeys[nodes[nodeIndex]] = Object.fromEntries(
        keys.slice(i, i + keysPerNode).map((key) => [key, combineTotalCount[key]]),
      )
      nodeIndex++
    }

    const findNodeWithKey = (key: string) =>
      Object.keys(nodeKeys).find((node) => !!nodeKeys[node as NodeID][key]) as NodeID

    // sendKeys is an object that contains the keys that each node will send to another node
    const sendKeys: { [node: NodeID]: ReducerState['sendKeys'] } = {}

    nodes.forEach((node) => {
      sendKeys[node] = {}
      Object.keys(mapReduceState.combineResults[node]).forEach((key) => {
        if (!nodeKeys[node][key]) {
          let nodeWithKey = findNodeWithKey(key)
          const nodeSendKeys = (sendKeys[node] as ReducerState['sendKeys']) || {}
          if (nodeSendKeys[nodeWithKey]) {
            nodeSendKeys[nodeWithKey].push(key)
          } else {
            nodeSendKeys[nodeWithKey] = [key]
          }
        }
      })
    })

    // receiveKeysFrom is an object that contains the nodes that will receive keys from another node
    const receiveKeysFrom: { [key: NodeID]: NodeID[] } = {}

    // nodes that will send keys to another node
    const nodesToSendKeys = Object.keys(sendKeys) as NodeID[]
    nodesToSendKeys.forEach((nodeFrom) => {
      // nodes that will receive keys from nodeFrom
      const nodesTo = Object.keys(
        (sendKeys[nodeFrom] as ReducerState['sendKeys']) || {},
      ) as NodeID[]
      nodesTo.forEach((nodeTo) => {
        if (!receiveKeysFrom[nodeTo]) {
          receiveKeysFrom[nodeTo] = [nodeFrom]
        } else {
          receiveKeysFrom[nodeTo].push(nodeFrom)
        }
      })
    })

    nodes.forEach((node) =>
      sendDirectMessage(node, {
        type: 'EJECUTAR_REDUCE',
        payload: {
          reduceKeys: nodeKeys[node] || {},
          sendKeys: sendKeys[node] || {},
          receiveKeysFrom: receiveKeysFrom[node] || [],
        },
      }),
    )

    setFinalResults((prev) => ({
      ...prev,
      mapTotalCount,
      combineTotalCount,
      reducerNodesCount: Object.keys(nodeKeys).filter(
        (node) => Object.values(nodeKeys[node as NodeID]).length > 0,
      ).length,
    }))
  }, [
    clusterNodes.length,
    sendDirectMessage,
    mapReduceState.combineResults,
    finished,
    mapReduceState.mapResults,
    isLoading,
  ])

  useEffect(() => {
    setFinalResults((prev) => ({
      ...prev,
      sizes: mapReduceState.sizes,
      mapNodesCount: mapReduceState.mapNodesCount,
    }))
  }, [mapReduceState.sizes, mapReduceState.mapNodesCount])

  const processingButtonText = !isReady
    ? 'Iniciando Python...'
    : !allNodesReady
      ? 'Esperando a los nodos'
      : 'Iniciar procesamiento'

  return (
    <main className='flex min-h-screen flex-col items-center p-5'>
      <Navbar title={`Administrando cluster #${clusterSession?.clusterID}`} />
      <div className='flex flex-col lg:flex-row justify-center w-full gap-10 mb-5'>
        <div className='w-full'>
          <BasicAccordion
            title={placeholdersFunctions.map.title}
            codeState={[code.mapCode, (newCode: string) => setCode({ ...code, mapCode: newCode })]}
            error={mapReduceState.output.stderr.mapCode}
            fileButtonDisabled={loading}
            total={mapNodesCount}
            current={mapReduceState.finishedMapNodes}
          />
          <BasicAccordion
            title={placeholdersFunctions.combine.title}
            codeState={[
              code.combineCode,
              (newCode: string) => setCode({ ...code, combineCode: newCode }),
            ]}
            error={mapReduceState.output.stderr.combineCode}
            fileButtonDisabled={loading}
            total={mapNodesCount}
            current={
              mapReduceState.code.combineCode
                ? mapReduceState.finishedCombineNodes
                : mapReduceState.finishedMapNodes
            }
          />
          <BasicAccordion
            title={placeholdersFunctions.reduce.title}
            codeState={[
              code.reduceCode,
              (newCode: string) => setCode({ ...code, reduceCode: newCode }),
            ]}
            error={mapReduceState.output.stderr.reduceCode}
            fileButtonDisabled={loading}
            total={finalResults.reducerNodesCount}
            current={mapReduceState.finishedReducerNodes}
          />
        </div>
        <div className='flex flex-col sm:flex-row lg:flex-col sm:justify-center lg:justify-start gap-10 items-center w-full min-w-fit lg:max-w-[300px]'>
          <NodeList />

          <FolderList
            fileTrees={fileTrees}
            forceEnableDeleteFile={!isLoading}
            handleDeleteFile={(tree: Tree) =>
              sendDirectMessage(tree.ownerId, {
                type: 'DELETE_FILE',
                payload: tree,
              })
            }
          />

          <div className='flex flex-col'>
            <LoadingButton
              variant='outlined'
              color='success'
              onClick={handleIniciarProcesamiento}
              loading={loading}
              loadingPosition='center'
              disabled={!allNodesReady || loading || !isReady}>
              {processingButtonText}
            </LoadingButton>

            {loading && (
              <Button
                variant='outlined'
                color='error'
                className='mt-2 w-[220px]'
                onClick={() => {
                  broadcastMessage({ type: 'RESET_READY_TO_EXECUTE' })
                  dispatchMapReduce({ type: 'RESET_READY_TO_EXECUTE' })
                  resetState()
                  setIsLoading(false)
                  toggleClusterLock(false)
                }}>
                Detener ejecución
              </Button>
            )}
          </div>
        </div>
      </div>

      <Output stderr={mapReduceState.errors} stdout={mapReduceState.output.stdout} />
      {finished && (
        <>
          <Results className='mt-5' title='Resultados' data={mapReduceState.reduceResult} />
          <Statistics info={statistics} />
        </>
      )}
    </main>
  )
}
