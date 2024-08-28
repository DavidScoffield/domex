'use client'

import Master from '@/components/Master'
import Slave from '@/components/Slave'
import useInitializeCluster from '@/hooks/useInitializeCluster'
import useCluster from '@/hooks/useCluster'

function Cluster() {
  useInitializeCluster()
  const { clusterSession } = useCluster()

  return clusterSession?.isMaster ? <Master /> : <Slave />
}

export default Cluster
