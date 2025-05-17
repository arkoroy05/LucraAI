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

// Network Configuration
export {
  BASE_MAINNET,
  BASE_SEPOLIA,
  getNetworkByChainId,
  getExplorerUrl,
  getAddressExplorerUrl,
  isBaseNetwork,
  getNetworkName
} from './config/networks'

// Transaction Utilities
export {
  prepareTransaction,
  formatTransaction,
  storeTransaction
} from './utils/transactions'

// Base Name Resolution Utilities
export {
  resolveBaseName,
  lookupBaseName,
  isBaseName,
  formatAddressOrName
} from './utils/baseNameService'

// Smart Wallet Utilities
export {
  createSmartWallet,
  storeSmartWallet,
  getStoredSmartWallet,
  clearStoredSmartWallet,
  hasStoredSmartWallet
} from './utils/smartWallet'

// AgentKit Utilities
export {
  createTransactionAgent,
  processTransactionRequest,
  extractTransactionDetails,
  isTransactionRequest
} from './utils/agentKit'

// Remove the duplicate BaseName exports since we're using baseNameResolver.js
