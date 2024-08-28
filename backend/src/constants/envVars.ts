export const NODE_ENV = process.env.NODE_ENV ?? 'development'
export const PORT = Number(process.env.PORT) || 5000
export const HOST = process.env.HOST ?? 'localhost'
export const HTTPS = process.env.HTTPS === 'true'
export const SERVER_KEY_NAME = process.env.SERVER_KEY_NAME ?? 'server.key'
export const SERVER_CERT_NAME = process.env.SERVER_CERT_NAME ?? 'server.crt'
export const CLUSTER_IDS_LENGTH = Number(process.env.CLUSTER_IDS_LENGTH) || 10
