"use client"

import { http, createConfig } from 'wagmi'
import { base, mainnet } from 'wagmi/chains'
import { injected, metaMask, walletConnect, coinbaseWallet } from 'wagmi/connectors'

// Get WalletConnect project ID from environment variable
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '9f9310517adea17021a541eca3140522'

// Create the Wagmi configuration
export const config = createConfig({
  chains: [mainnet, base],
  connectors: [
    injected(),
    walletConnect({ projectId }),
    metaMask(),
    coinbaseWallet({
      appName: 'Lucra AI',
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
  },
})
