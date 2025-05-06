"use client"

import { useState, useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { WagmiProvider } from 'wagmi'
import { config } from '../config/wagmi'

/**
 * Web3Provider component that wraps the application with necessary providers
 * for web3 functionality including Wagmi and React Query
 */
export function Web3Provider({ children }) {
  // Create state for the query client to ensure it's only created once on the client side
  const [queryClient] = useState(() => new QueryClient())

  // State to track if component is mounted (client-side only)
  const [mounted, setMounted] = useState(false)

  // Set mounted to true after component mounts
  useEffect(() => {
    setMounted(true)
  }, [])

  // Only render children when mounted to prevent hydration errors
  if (!mounted) {
    return null;
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
