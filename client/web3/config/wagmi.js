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
    injected({
      shimDisconnect: true,
    }),
    walletConnect({
      projectId,
      showQrModal: true,
      qrModalOptions: {
        themeMode: 'dark',
        themeVariables: {
          '--wcm-z-index': '9999',
          '--wcm-accent-color': '#8b5cf6',
          '--wcm-accent-fill-color': '#ffffff',
          '--wcm-background-color': '#0B0118',
          '--wcm-container-border-radius': '16px',
        },
      },
      metadata: {
        name: 'Lucra AI',
        description: 'Your AI-powered crypto assistant',
        url: 'https://lucra.ai',
        icons: ['https://avatars.githubusercontent.com/u/37784886'],
      },
    }),
    metaMask({
      shimDisconnect: true,
    }),
    coinbaseWallet({
      appName: 'Lucra AI',
      appLogoUrl: 'https://example.com/logo.png', // Add a logo URL (replace with your actual logo)
      headlessMode: true, // Enable headless mode for better mobile experience
      reloadOnDisconnect: false, // Prevent page reload on disconnect
      darkMode: true,
      jsonRpcUrl: 'https://mainnet.base.org', // Provide a fallback RPC URL
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http(),
  },
})
