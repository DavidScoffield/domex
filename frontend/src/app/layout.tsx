import CompatibilityChecker from '@/components/CompatibilityChecker'
import AlertModal from '@/components/ui/AlertModal'
import { AlertModalProvider } from '@/context/AlertModalContext'
import { FilesProvider } from '@/context/FilesContext'
import { MapReduceProvider } from '@/context/MapReduceContext'
import { ClusterProvider } from '@/context/ClusterContext'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'
import { promises as fs } from 'fs'
import path from 'path'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DOMEX',
  description: 'DOMEX: Distributed Online Mapreduce EXperience',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const MapReduceJobCode = await fs.readFile(
    path.join(process.cwd(), 'public/python/MapReduceJob.py'),
    'utf8',
  )

  return (
    <html lang='en'>
      <body className={`${inter.className} h-screen m-0`}>
        <AlertModalProvider>
          <ClusterProvider>
            <MapReduceProvider MapReduceJobCode={MapReduceJobCode}>
              <FilesProvider>
                {children}
                <Toaster richColors />
                <AlertModal />
              </FilesProvider>
            </MapReduceProvider>
          </ClusterProvider>
        </AlertModalProvider>
        <CompatibilityChecker />
      </body>
    </html>
  )
}
