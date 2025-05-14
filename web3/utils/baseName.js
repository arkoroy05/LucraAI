/**
 * Utilities for Base Name resolution
 * This provides a mock implementation for resolving human-readable names to Ethereum addresses and vice versa
 */

// Mock function to check if a string is an Ethereum address
function isAddress(value) {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value);
}

// Mock Base chains
const base = {
  id: 8453,
  name: 'Base Mainnet',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }
};

const baseSepolia = {
  id: 84532,
  name: 'Base Sepolia',
  nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 }
};

// Mock public client
const createMockPublicClient = () => {
  return {
    readContract: async ({ address, abi, functionName, args }) => {
      console.log(`Mock readContract called: ${functionName}(${args.join(', ')})`);

      // Mock implementation for resolve function
      if (functionName === 'resolve') {
        const name = args[0];
        // Return mock addresses for common test names
        if (name === 'alice.base') return '0x1234567890123456789012345678901234567890';
        if (name === 'bob.base') return '0x2345678901234567890123456789012345678901';
        if (name === 'charlie.base') return '0x3456789012345678901234567890123456789012';
        if (name === 'vitalik.base') return '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045';

        // For other names, generate a deterministic address based on the name
        return `0x${name.replace(/[^a-z0-9]/gi, '').padEnd(40, '0').slice(0, 40)}`;
      }

      // Mock implementation for reverseLookup function
      if (functionName === 'reverseLookup') {
        const address = args[0];
        // Return mock names for common test addresses
        if (address === '0x1234567890123456789012345678901234567890') return 'alice.base';
        if (address === '0x2345678901234567890123456789012345678901') return 'bob.base';
        if (address === '0x3456789012345678901234567890123456789012') return 'charlie.base';
        if (address === '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045') return 'vitalik.base';

        // For other addresses, return null (no name found)
        return null;
      }

      return null;
    },
    getBalance: async ({ address }) => {
      console.log(`Mock getBalance called for address: ${address}`);
      // Return a mock balance (0.1 ETH in wei)
      return BigInt('100000000000000000');
    }
  };
};

// Create mock public clients for Base Mainnet and Sepolia
const baseClient = createMockPublicClient();
const baseSepoliaClient = createMockPublicClient();

// Base Name Service Registry contract addresses
const BASE_NAME_REGISTRY_MAINNET = '0x4D9b7203d4bD7EB0b1a1C1256e2A8b9A5C9F8a0F'; // Example address, replace with actual
const BASE_NAME_REGISTRY_SEPOLIA = '0x7bE7dA85166D4e4D3fD4A7aBB3F5b84D56F0c0C2'; // Example address, replace with actual

// Base Name Service Registry ABI (simplified for the resolver function)
const BASE_NAME_REGISTRY_ABI = [
  {
    inputs: [{ internalType: 'string', name: 'name', type: 'string' }],
    name: 'resolve',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'addr', type: 'address' }],
    name: 'reverseLookup',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
];

/**
 * Resolves a Base Name to an Ethereum address
 * @param {string} name - Base Name to resolve (e.g., "alice.base")
 * @param {boolean} useTestnet - Whether to use the Sepolia testnet
 * @returns {Promise<string|null>} - Resolved Ethereum address or null if not found
 */
export async function resolveBaseName(name, useTestnet = false) {
  try {
    // Check if the input is already an Ethereum address
    if (isAddress(name)) {
      return name;
    }

    // Check if the name has a .base suffix
    if (!name.endsWith('.base')) {
      name = `${name}.base`;
    }

    // Select the appropriate client and registry address based on the network
    const client = useTestnet ? baseSepoliaClient : baseClient;
    const registryAddress = useTestnet ? BASE_NAME_REGISTRY_SEPOLIA : BASE_NAME_REGISTRY_MAINNET;

    try {
      // Call the resolve function on the Base Name Service Registry contract
      const address = await client.readContract({
        address: registryAddress,
        abi: BASE_NAME_REGISTRY_ABI,
        functionName: 'resolve',
        args: [name],
      });

      return address;
    } catch (contractError) {
      console.warn(`Base Name resolution failed for ${name}:`, contractError);
      return null;
    }
  } catch (error) {
    console.error('Error resolving Base Name:', error);
    return null;
  }
}

/**
 * Looks up the Base Name for an Ethereum address
 * @param {string} address - Ethereum address to look up
 * @param {boolean} useTestnet - Whether to use the Sepolia testnet
 * @returns {Promise<string|null>} - Base Name or null if not found
 */
export async function lookupBaseName(address, useTestnet = false) {
  try {
    // Check if the input is a valid Ethereum address
    if (!isAddress(address)) {
      return null;
    }

    // Select the appropriate client and registry address based on the network
    const client = useTestnet ? baseSepoliaClient : baseClient;
    const registryAddress = useTestnet ? BASE_NAME_REGISTRY_SEPOLIA : BASE_NAME_REGISTRY_MAINNET;

    try {
      // Call the reverseLookup function on the Base Name Service Registry contract
      const name = await client.readContract({
        address: registryAddress,
        abi: BASE_NAME_REGISTRY_ABI,
        functionName: 'reverseLookup',
        args: [address],
      });

      return name || null;
    } catch (contractError) {
      console.warn(`Base Name lookup failed for ${address}:`, contractError);
      return null;
    }
  } catch (error) {
    console.error('Error looking up Base Name:', error);
    return null;
  }
}

/**
 * Checks if a string is a valid Base Name
 * @param {string} name - Name to check
 * @returns {boolean} - True if the name is a valid Base Name
 */
export function isBaseName(name) {
  // Check if the name has a .base suffix
  return typeof name === 'string' && name.endsWith('.base');
}

/**
 * Formats an address or Base Name for display
 * @param {string} addressOrName - Ethereum address or Base Name
 * @param {number} prefixLength - Number of characters to show at the beginning of an address
 * @param {number} suffixLength - Number of characters to show at the end of an address
 * @returns {string} - Formatted address or Base Name
 */
export function formatAddressOrName(addressOrName, prefixLength = 6, suffixLength = 4) {
  if (!addressOrName) return '';

  // If it's a Base Name, return it as is
  if (isBaseName(addressOrName)) {
    return addressOrName;
  }

  // If it's an Ethereum address, format it
  if (isAddress(addressOrName)) {
    return `${addressOrName.slice(0, prefixLength)}...${addressOrName.slice(-suffixLength)}`;
  }

  // If it's neither, return it as is
  return addressOrName;
}
