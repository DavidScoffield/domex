import React from 'react'

import useCluster from '@/hooks/useCluster'

import PersonIcon from '@mui/icons-material/Person'
import PersonOffIcon from '@mui/icons-material/PersonOff'
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts'
import LogoutRounded from '@mui/icons-material/LogoutRounded'

import { Node } from '@/types'
import { Box, IconButton, Tooltip, Typography, Zoom } from '@mui/material'

function getNodeIcon(node: Node) {
  if (node.isMaster) return ManageAccountsIcon
  if (!node.socketConnected || !node.peerConnected) return PersonOffIcon
  return PersonIcon
}

function getExecutionStatus(node: Node) {
  if (!node.socketConnected) return 'Socket desconectado...'
  if (node.socketConnected && !node.peerConnected) return 'Peer desconectado...'

  return node.executionStatus
}

function getExecutionStatusColor(node: Node) {
  if (!node.socketConnected || node.executionStatus.includes('Error')) return 'error'

  if (!node.peerConnected) return 'warning'

  return 'success'
}

export const KickNodeButton = ({ node }: { node: Node }) => {
  const { clusterSession, kickNode } = useCluster()

  if (!clusterSession?.isMaster || node.isMaster) return null

  return (
    <Tooltip TransitionComponent={Zoom} title='Expulsar nodo'>
      <IconButton
        className='cursor-pointer ml-auto text-gray-400 hover:text-red-600'
        onClick={() => kickNode(node.nodeID)}>
        <LogoutRounded />
      </IconButton>
    </Tooltip>
  )
}

export function NodeDisplay(node: Node) {
  const Icon = getNodeIcon(node)
  const color = getExecutionStatusColor(node)
  const nodeName = node.nodeName + (node.isMaster ? ' (Master)' : '')
  const description = getExecutionStatus(node)

  return (
    <Box className='flex flex-row items-center mb-2'>
      <Icon color={color} fontSize='large' className='mr-2' />

      <Box>
        <Typography className='text-base font-bold'>{nodeName}</Typography>
        {description && <Typography className='text-sm'>{description}</Typography>}
      </Box>

      <KickNodeButton node={node} />
    </Box>
  )
}
