'use client'

import { NodeID } from '@/types'
import { PropsWithChildren, createContext, useState } from 'react'

export type FilesContextType = {
  selectedFiles: File[]
  setSelectedFiles: React.Dispatch<React.SetStateAction<File[]>>
  nodesFiles: Record<NodeID, string[]> // NodeID -> [nameFile, nameFile, ...]
  setNodesFiles: React.Dispatch<React.SetStateAction<Record<NodeID, string[]>>>
}

const FilesContext = createContext<FilesContextType>({
  selectedFiles: [],
  setSelectedFiles: () => {},
  nodesFiles: {},
  setNodesFiles: () => {},
})

export const FilesProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [nodesFiles, setNodesFiles] = useState<Record<NodeID, string[]>>({})

  return (
    <FilesContext.Provider
      value={{
        selectedFiles,
        setSelectedFiles,
        nodesFiles,
        setNodesFiles,
      }}>
      {children}
    </FilesContext.Provider>
  )
}

export default FilesContext
