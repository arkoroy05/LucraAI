"use client"

import { http, createConfig } from 'wagmi'
import { base, mainnet } from 'wagmi/chains'
import { injected, metaMask, walletConnect, coinbaseWallet } from 'wagmi/connectors'

// Define Base Sepolia testnet
const baseSepolia = {
  id: 84532,
  name: 'Base Sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Sepolia Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org'],
    },
    public: {
      http: [process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org'],
    },
  },
  blockExplorers: {
    default: {
      name: 'BaseScan',
      url: 'https://sepolia.basescan.org',
    },
  },
  testnet: true,
}

// Get WalletConnect project ID from environment variable
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '9f9310517adea17021a541eca3140522'

// Log the project ID to help with debugging
console.log('WalletConnect Project ID:', projectId ? 'Configured' : 'Missing')

// Create the Wagmi configuration
export const config = createConfig({
  chains: [base, baseSepolia, mainnet],
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
      headlessMode: false, // Disable headless mode to fix connection issues
      reloadOnDisconnect: false, // Prevent page reload on disconnect
      darkMode: true,
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [base.id]: http({
      batch: { batchSize: 1 },
      fetchOptions: {
        headers: {
          'Content-Type': 'application/json',
        },
      },
      retryCount: 3,
      retryDelay: 1000,
    }),
    [baseSepolia.id]: http({
      batch: { batchSize: 1 },
      fetchOptions: {
        headers: {
          'Content-Type': 'application/json',
        },
      },
      retryCount: 3,
      retryDelay: 1000,
    }),
  },
})
