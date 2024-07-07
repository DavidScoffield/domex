import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'
import { Box } from '@mui/material'
import GroupsIcon from '@mui/icons-material/Groups'

import useRoom from '@/hooks/useRoom'
import { UserDisplay } from '@/components/Users'

export default function NodeList() {
  const { clusterUsers } = useRoom()

  return (
    <Card
      className='bg-white shadow-lg border border-gray-300 rounded-md w-full max-w-[500px]'
      variant='outlined'>
      <CardContent>
        <h2 className='text-lg font-semibold text-center'>Nodos</h2>

        <Box className='max-h-[300px] overflow-auto'>
          {!clusterUsers.length ? (
            <Box className='flex flex-col items-center'>
              <GroupsIcon fontSize='large' color='action' />
              <Typography className='mt-1 italic text-gray-500'>
                Aún no se unió ningún nodo...
              </Typography>
            </Box>
          ) : (
            clusterUsers.map((node, index) => <UserDisplay key={index} {...node} />)
          )}
        </Box>
      </CardContent>
    </Card>
  )
}
