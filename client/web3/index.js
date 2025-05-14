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
