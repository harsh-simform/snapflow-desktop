import React from 'react'
import type { AppProps } from 'next/app'
import { Toaster } from 'sonner'
import { TooltipProvider } from '../components/ui/Tooltip'

import '../styles/globals.css'

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Component {...pageProps} />
      <Toaster
        position="top-right"
        theme="dark"
        toastOptions={{
          className: 'rounded-lg border border-gray-800 bg-gray-900 text-gray-100 shadow-xl',
        }}
      />
    </TooltipProvider>
  )
}

export default MyApp
