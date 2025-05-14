/**
 * Web3 integration for LucraAI
 * This file exports all the utilities and configuration for the web3 integration
 */

// Export network configuration
export {
  BASE_MAINNET,
  BASE_SEPOLIA,
  getExplorerUrl,
  getAddressExplorerUrl,
  getNetworkByChainId,
  isBaseNetwork,
  getNetworkName
} from './config/networks';

// Export Base Name utilities
export {
  resolveBaseName,
  lookupBaseName,
  isBaseName,
  formatAddressOrName
} from './utils/baseName';

// Export Smart Wallet utilities
export {
  createSmartWallet,
  storeSmartWallet,
  getStoredSmartWallet,
  clearStoredSmartWallet,
  hasStoredSmartWallet
} from './utils/smartWallet';

// Export transaction utilities
export {
  prepareTransaction,
  formatTransaction,
  storeTransaction
} from './utils/transactions';

// Export AgentKit utilities
export {
  createTransactionAgent,
  processTransactionRequest,
  extractTransactionDetails
} from './utils/agentKit';
