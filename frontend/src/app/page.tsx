'use client'

import useInitializeCluster from '@/hooks/useInitializeCluster'
import useCluster from '@/hooks/useCluster'
import { ClusterID } from '@/types'
import { LockOutlined as LockOutlinedIcon } from '@mui/icons-material'
import { Avatar } from '@mui/joy'
import { Button, TextField, Typography } from '@mui/material'
import { useRef, useState } from 'react'

export default function Home() {
  useInitializeCluster()
  const { joinCluster } = useCluster()
  const [missingNodeName, setMissingNodeName] = useState(false)
  const [missingClusterId, setMissingClusterId] = useState(false)

  const nodeRef = useRef<HTMLInputElement>(null)
  const clusterIDRef = useRef<HTMLInputElement>(null)

  const handleCreateCluster = () => {
    const nodeName = nodeRef.current?.value
    setMissingNodeName(!nodeName)

    if (!nodeName) return

    joinCluster({
      nodeName: nodeName,
      clusterID: clusterIDRef.current?.value as ClusterID,
      creatingCluster: true,
    })
  }

  const handleSubmitJoinCluster = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const nodeName = nodeRef.current?.value
    const clusterID = clusterIDRef.current?.value

    setMissingNodeName(!nodeName)
    setMissingClusterId(!clusterID)

    if (!nodeName || !clusterID) return

    joinCluster({
      nodeName: nodeName,
      clusterID: clusterID as ClusterID,
      creatingCluster: false,
    })
  }

  return (
    <main className='flex min-h-full justify-center items-center px-24 lg:p-0  '>
      <section className='flex flex-col items-center'>
        <Avatar sx={{ m: 0, bgcolor: '#3676d2' }} variant='solid'>
          <LockOutlinedIcon />
        </Avatar>
        <Typography component='h1' variant='h6' marginBottom={3}>
          Ingresar
        </Typography>

        <div className='pb-5 max-w-xs'>
          <TextField
            label='Identificador del nodo*'
            inputRef={nodeRef}
            helperText={missingNodeName ? 'Por favor complete este campo' : ''}
            error={missingNodeName}
          />
        </div>
        <div className='flex gap-5'>
          <form className='flex gap-5 flex-col' onSubmit={handleSubmitJoinCluster}>
            <TextField
              label='Indentificador del cluster'
              helperText={missingClusterId ? 'Por favor complete este campo' : ''}
              error={missingClusterId}
              inputRef={clusterIDRef}
            />
            <Button variant='outlined' type='submit'>
              Unirse
            </Button>
          </form>
          <Button
            sx={{
              height: 'auto',
            }}
            variant='outlined'
            color='success'
            onClick={handleCreateCluster}>
            Crear un cluster
          </Button>
        </div>
      </section>
    </main>
  )
}
