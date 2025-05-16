/**
 * Network configuration for Base Mainnet and Sepolia Testnet
 * This provides network details for use throughout the application
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
    alchemy: 'https://base-mainnet.g.alchemy.com/v2/',
    infura: 'https://base-mainnet.infura.io/v3/'
  },
  blockExplorers: {
    default: {
      name: 'BaseScan',
      url: 'https://basescan.org',
    },
    etherscan: {
      name: 'BaseScan',
      url: 'https://basescan.org'
    }
  },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
      blockCreated: 5022
    }
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
    alchemy: 'https://base-sepolia.g.alchemy.com/v2/',
    infura: 'https://base-sepolia.infura.io/v3/'
  },
  blockExplorers: {
    default: {
      name: 'BaseScan',
      url: 'https://sepolia.basescan.org',
    },
    etherscan: {
      name: 'BaseScan',
      url: 'https://sepolia.basescan.org'
    }
  },
  contracts: {
    multicall3: {
      address: '0xcA11bde05977b3631167028862bE2a173976CA11',
      blockCreated: 1059647
    }
  },
  testnet: true,
};

/**
 * Get the block explorer URL for a transaction hash, address, or block on a specific network
 * @param {string} hash - Transaction hash, address, or block number
 * @param {object} network - Network configuration object
 * @param {string} type - Type of explorer URL ('tx', 'address', 'block')
 * @returns {string} - Block explorer URL
 */
export function getExplorerUrl(hash, network = BASE_MAINNET, type = 'tx') {
  if (!hash) return '';

  const baseUrl = network.blockExplorers?.default?.url ||
                 (network.id === BASE_MAINNET.id ? 'https://basescan.org' : 'https://sepolia.basescan.org');

  switch (type) {
    case 'tx':
      return `${baseUrl}/tx/${hash}`;
    case 'address':
      return `${baseUrl}/address/${hash}`;
    case 'block':
      return `${baseUrl}/block/${hash}`;
    default:
      return `${baseUrl}/${type}/${hash}`;
  }
}

/**
 * Get the block explorer URL for an address on a specific network
 * @param {string} address - Ethereum address
 * @param {object} network - Network configuration object
 * @returns {string} - Block explorer URL for the address
 */
export function getAddressExplorerUrl(address, network = BASE_MAINNET) {
  return getExplorerUrl(address, network, 'address');
}

/**
 * Get the network configuration by chain ID
 * @param {number} chainId - Chain ID
 * @returns {object|null} - Network configuration object or null if not found
 */
export function getNetworkByChainId(chainId) {
  if (typeof chainId !== 'number') {
    try {
      chainId = Number(chainId);
    } catch (error) {
      console.error('Invalid chain ID:', chainId);
      return null;
    }
  }

  if (chainId === BASE_MAINNET.id) return BASE_MAINNET;
  if (chainId === BASE_SEPOLIA.id) return BASE_SEPOLIA;
  return null;
}

/**
 * Get a network configuration by its name
 * @param {string} name - Network name
 * @returns {object|null} - Network configuration or null if not found
 */
export function getNetworkByName(name) {
  if (!name) return null;

  const lowerName = name.toLowerCase();

  if (lowerName === BASE_MAINNET.name.toLowerCase() ||
      lowerName.includes('mainnet') ||
      lowerName === 'base') {
    return BASE_MAINNET;
  }

  if (lowerName === BASE_SEPOLIA.name.toLowerCase() ||
      lowerName.includes('sepolia') ||
      lowerName === 'testnet') {
    return BASE_SEPOLIA;
  }

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
