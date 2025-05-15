/**
 * Network configuration for Base Mainnet and Sepolia Testnet
 */

// Base Mainnet configuration
export const BASE_MAINNET = {
  id: 8453,
  name: 'Base',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: process.env.NEXT_PUBLIC_BASE_MAINNET_RPC_URL || 'https://mainnet.base.org',
    public: process.env.NEXT_PUBLIC_BASE_MAINNET_RPC_URL || 'https://mainnet.base.org',
  },
  blockExplorers: {
    default: {
      name: 'BaseScan',
      url: 'https://basescan.org',
    },
  },
  testnet: false,
};

// Base Sepolia Testnet configuration
export const BASE_SEPOLIA = {
  id: 84532,
  name: 'Base Sepolia',
  nativeCurrency: {
    decimals: 18,
    name: 'Sepolia Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
    public: process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org',
  },
  blockExplorers: {
    default: {
      name: 'BaseScan',
      url: 'https://sepolia.basescan.org',
    },
  },
  testnet: true,
};

/**
 * Get the block explorer URL for a transaction hash on a specific network
 * @param {string} txHash - Transaction hash
 * @param {object} network - Network configuration object
 * @returns {string} - Block explorer URL for the transaction
 */
export function getExplorerUrl(txHash, network = BASE_MAINNET) {
  return `${network.blockExplorers.default.url}/tx/${txHash}`;
}

/**
 * Get the block explorer URL for an address on a specific network
 * @param {string} address - Ethereum address
 * @param {object} network - Network configuration object
 * @returns {string} - Block explorer URL for the address
 */
export function getAddressExplorerUrl(address, network = BASE_MAINNET) {
  return `${network.blockExplorers.default.url}/address/${address}`;
}

/**
 * Get the network configuration by chain ID
 * @param {number} chainId - Chain ID
 * @returns {object|null} - Network configuration object or null if not found
 */
export function getNetworkByChainId(chainId) {
  if (chainId === BASE_MAINNET.id) return BASE_MAINNET;
  if (chainId === BASE_SEPOLIA.id) return BASE_SEPOLIA;
  return null;
}

/**
 * Check if a chain ID is a Base network
 * @param {number} chainId - Chain ID
 * @returns {boolean} - True if the chain ID is a Base network
 */
export function isBaseNetwork(chainId) {
  return chainId === BASE_MAINNET.id || chainId === BASE_SEPOLIA.id;
}

/**
 * Get the network name by chain ID
 * @param {number} chainId - Chain ID
 * @returns {string} - Network name or 'Unknown Network' if not found
 */
export function getNetworkName(chainId) {
  const network = getNetworkByChainId(chainId);
  return network ? network.name : 'Unknown Network';
}
