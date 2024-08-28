'use client'

import useCluster from '@/hooks/useCluster'
import { generateInitialsAvatar } from '@/lib/avatars'
import { LogoutRounded as LogoutRoundedIcon } from '@mui/icons-material'
import AccountCircle from '@mui/icons-material/AccountCircle'
import { Avatar, Dropdown, ListDivider, Menu, MenuButton, Typography } from '@mui/joy'
import { Skeleton } from '@mui/material'
import AppBar from '@mui/material/AppBar'
import Box from '@mui/material/Box'
import MenuItem from '@mui/material/MenuItem'
import Toolbar from '@mui/material/Toolbar'
import { useEffect, useState } from 'react'

const AvatarImage = ({
  alt = 'avatar icon',
  url = null,
  isLoading = false,
}: {
  isLoading?: boolean
  url: string | null
  alt: string
}) => {
  if (isLoading) return <Skeleton variant='circular' width={32} height={32} />

  return url ? <Avatar size='sm' src={url} alt={alt} /> : <AccountCircle fontSize='large' />
}

export default function Navbar({ title }: { title: string }) {
  const { clusterSession, leaveCluster } = useCluster()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [isLoadingAvatar, setIsLoadingAvatar] = useState(true)

  const isMaster = clusterSession?.isMaster
  const nodeName = clusterSession?.nodeName

  useEffect(() => {
    if (!nodeName) return

    setIsLoadingAvatar(true)
    generateInitialsAvatar(nodeName)
      .then(setAvatarUrl)
      .finally(() => setIsLoadingAvatar(false))
  }, [nodeName])

  return (
    <Box sx={{ width: '100%', mb: 5 }}>
      <AppBar position='static'>
        <Toolbar>
          <Typography component='div' sx={{ flexGrow: 1 }} textColor={'common.white'}>
            {title}
          </Typography>

          <Dropdown>
            <MenuButton
              variant='plain'
              size='sm'
              aria-label='account of current node'
              aria-haspopup='true'
              sx={{
                bgcolor: 'inherit',
                '&:hover, &:active, &:focus': {
                  bgcolor: 'inherit',
                },
                '&:hover': {
                  filter: 'brightness(0.9)',
                },
                padding: 0,
                borderRadius: '50%',
              }}>
              <AvatarImage isLoading={isLoadingAvatar} alt='nodename avatar' url={avatarUrl} />
            </MenuButton>
            <Menu
              placement='bottom-end'
              size='sm'
              sx={{
                zIndex: '99999',
                p: 1,
                gap: 1,
                '--ListItem-radius': 'var(--joy-radius-md)',
              }}>
              <MenuItem>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                  }}>
                  <AvatarImage isLoading={isLoadingAvatar} alt='nodename avatar' url={avatarUrl} />
                  <Box sx={{ ml: 1.5 }}>
                    <Typography level='title-sm' textColor='text.primary'>
                      {clusterSession?.nodeName}
                    </Typography>
                    <Typography level='body-xs' textColor='text.tertiary'>
                      Nodo <strong>{isMaster ? 'Master' : 'Slave'}</strong>
                    </Typography>
                  </Box>
                </Box>
              </MenuItem>
              <ListDivider />
              <MenuItem onClick={() => leaveCluster()}>
                <LogoutRoundedIcon />
                <span className='ml-2'>{isMaster ? 'Cerrar cluster' : 'Abandonar cluster'}</span>
              </MenuItem>
            </Menu>
          </Dropdown>
        </Toolbar>
      </AppBar>
    </Box>
  )
}
