// Export all components and hooks for easy importing

// Components
export { Web3Provider } from './components/Web3Provider'
export { ConnectWallet } from './components/ConnectWallet'
export { AccountInfo } from './components/AccountInfo'
export { TransactionUI } from './components/TransactionUI'
export { SmartWalletUI } from './components/SmartWalletUI'

// Hooks
export { useWalletConnection } from './hooks/useWalletConnection'
export { useTransactions } from './hooks/useTransactions'
export { useSmartWallet } from './hooks/useSmartWallet'
export { useWalletBalance } from './hooks/useWalletBalance'

// Config
export { config as wagmiConfig } from './config/wagmi'
