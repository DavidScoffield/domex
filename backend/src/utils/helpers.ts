import crypto, { type UUID } from 'crypto'
import { type ClusterID } from '../types.js'
import { CLUSTER_IDS_LENGTH } from '../constants/envVars.js'

export const generateRandomClusterId = (): ClusterID => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let clusterId = ''
  for (let i = 0; i < CLUSTER_IDS_LENGTH; i++) {
    clusterId += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return clusterId as ClusterID
}

export const generateRandomUUID = (): UUID => {
  return crypto.randomUUID()
}
