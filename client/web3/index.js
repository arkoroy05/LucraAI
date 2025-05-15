// Export all components and hooks for easy importing

// Components
export { Web3Provider } from './components/Web3Provider'
export { ConnectWallet } from './components/ConnectWallet'
export { AccountInfo } from './components/AccountInfo'
export { TransactionUI } from './components/TransactionUI'
export { SmartWalletUI } from './components/SmartWalletUI'
export { FundSmartWallet } from './components/FundSmartWallet'

// Hooks
export { useWalletConnection } from './hooks/useWalletConnection'
export { useWalletSigning } from './hooks/useWalletSigning'
export { useTransactions } from './hooks/useTransactions'
export { useSmartWallet } from './hooks/useSmartWallet'
export { useSmartWalletMapping } from './hooks/useSmartWalletMapping'
export { useWalletBalance } from './hooks/useWalletBalance'
export { useBaseName } from './hooks/useBaseName'

// Config
export { config as wagmiConfig } from './config/wagmi'

// Transaction Utilities
export {
  prepareTransaction,
  formatTransaction,
  storeTransaction
} from './utils/transactions'

// Base Name Resolution Utilities
export {
  resolveBaseName,
  lookupBaseName
} from './utils/baseNameResolver'

// Network Constants
export const BASE_MAINNET = {
  id: 8453,
  name: 'Base Mainnet',
  rpcUrl: 'https://mainnet.base.org',
  blockExplorer: 'https://basescan.org',
  currency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18
  }
}

export const BASE_SEPOLIA = {
  id: 84532,
  name: 'Base Sepolia',
  rpcUrl: 'https://sepolia.base.org',
  blockExplorer: 'https://sepolia.basescan.org',
  currency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18
  }
}

/**
 * Gets a network object by chain ID
 * @param {number} chainId - The chain ID to look up
 * @returns {Object|null} - The network object or null if not found
 */
export function getNetworkByChainId(chainId) {
  if (!chainId) return null;
  
  const networks = {
    [BASE_MAINNET.id]: BASE_MAINNET,
    [BASE_SEPOLIA.id]: BASE_SEPOLIA
  };
  
  return networks[chainId] || null;
}
