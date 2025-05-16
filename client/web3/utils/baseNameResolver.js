/**
 * Utility functions for Base Name resolution and lookup
 * This implementation uses the Base Name Service contracts for proper name resolution
 */

import { createPublicClient, http, stringToHex, keccak256, concat } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { BASE_MAINNET, BASE_SEPOLIA } from '../config/networks';

// Official Base Name Service contract addresses from https://github.com/base/basenames
const BASE_NAME_REGISTRY_MAINNET = '0xb94704422c2a1e396835a571837aa5ae53285a95';
const BASE_NAME_REGISTRAR_MAINNET = '0x03c4738ee98ae44591e1a4a4f3cab6641d95dd9a';
const BASE_NAME_RESOLVER_MAINNET = '0xC6d566A56A1aFf6508b41f6c90ff131615583BCD';
const BASE_NAME_REVERSE_REGISTRAR_MAINNET = '0x79ea96012eea67a83431f1701b3dff7e37f9e282';

const BASE_NAME_REGISTRY_SEPOLIA = '0x1493b2567056c2181630115660963E13A8E32735';
const BASE_NAME_REGISTRAR_SEPOLIA = '0xa0c70ec36c010b55e3c434d6c6ebeec50c705794';
const BASE_NAME_RESOLVER_SEPOLIA = '0x6533C94869D28fAA8dF77cc63f9e2b2D6Cf77eBA';
const BASE_NAME_REVERSE_REGISTRAR_SEPOLIA = '0xa0A8401ECF248a9375a0a71C4dedc263dA18dCd7';

const isValidAddress = (address) => /^0x[a-fA-F0-9]{40}$/.test(address);

const VALIDATED_REGISTRY_MAINNET = isValidAddress(BASE_NAME_REGISTRY_MAINNET)
  ? BASE_NAME_REGISTRY_MAINNET
  : '0x000000000000000000000000000000000000dEaD';

const VALIDATED_REGISTRY_SEPOLIA = isValidAddress(BASE_NAME_REGISTRY_SEPOLIA)
  ? BASE_NAME_REGISTRY_SEPOLIA
  : '0x000000000000000000000000000000000000dEaD';

const ENS_REGISTRY_ABI = [
  {
    inputs: [{ internalType: 'bytes32', name: 'node', type: 'bytes32' }],
    name: 'resolver',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'node', type: 'bytes32' }],
    name: 'owner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  }
];

const ENS_RESOLVER_ABI = [
  {
    inputs: [{ internalType: 'bytes32', name: 'node', type: 'bytes32' }],
    name: 'addr',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'bytes32', name: 'node', type: 'bytes32' },
      { internalType: 'uint256', name: 'coinType', type: 'uint256' }
    ],
    name: 'addr',
    outputs: [{ internalType: 'bytes', name: '', type: 'bytes' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'node', type: 'bytes32' }],
    name: 'name',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  }
];

const REVERSE_REGISTRAR_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'addr', type: 'address' }],
    name: 'node',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'pure',
    type: 'function',
  }
];

// Use network configuration imported above

const baseClient = createPublicClient({
  chain: base,
  transport: http(BASE_MAINNET.rpcUrls.default),
});
const baseSepoliaClient = createPublicClient({
  chain: baseSepolia,
  transport: http(BASE_SEPOLIA.rpcUrls.default),
});

function isAddress(value) {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value);
}

/**
 * Calculate the namehash of a name
 * @param {string} name - The name to hash
 * @returns {string} - The namehash as a hex string
 */
function namehash(name) {
  if (!name) return '0x0000000000000000000000000000000000000000000000000000000000000000';

  // Split the name into labels
  const labels = name.split('.');

  // Start with the empty namehash
  let node = '0x0000000000000000000000000000000000000000000000000000000000000000';

  // Process each label from right to left
  for (let i = labels.length - 1; i >= 0; i--) {
    const labelHash = keccak256(stringToHex(labels[i]));
    node = keccak256(concat([node, labelHash]));
  }

  return node;
}

/**
 * Resolves a Base Name to an Ethereum address
 * @param {string} name - The Base Name to resolve
 * @param {boolean} useTestnet - Whether to use testnet or mainnet resolution
 * @returns {Promise<string|null>} - The resolved Ethereum address or null if not found
 */
export async function resolveBaseName(name, useTestnet = false) {
  try {
    // Handle null or undefined input
    if (!name) return null;

    // If the input is already an Ethereum address, return it
    if (isAddress(name)) return name;

    // Ensure name is a string
    name = String(name);

    // Add .base suffix if not present
    if (!name.endsWith('.base')) {
      name = `${name}.base`;
    }

    // Select the appropriate client and registry address based on the network
    const client = useTestnet ? baseSepoliaClient : baseClient;
    const registryAddress = useTestnet ? VALIDATED_REGISTRY_SEPOLIA : VALIDATED_REGISTRY_MAINNET;
    const resolverAddress = useTestnet ? BASE_NAME_RESOLVER_SEPOLIA : BASE_NAME_RESOLVER_MAINNET;

    // Check if the registry address is valid
    if (!isValidAddress(registryAddress)) {
      console.warn(`Invalid registry address: ${registryAddress}`);
      return null;
    }

    try {
      // Calculate the namehash for the name
      const nameNode = namehash(name);

      // Try to get the resolver for this name
      const resolverAddr = await client.readContract({
        address: registryAddress,
        abi: ENS_REGISTRY_ABI,
        functionName: 'resolver',
        args: [nameNode],
      });

      // If no resolver is set, return null
      if (resolverAddr === '0x0000000000000000000000000000000000000000') {
        console.warn(`No resolver set for ${name}`);
        return null;
      }

      // Call the addr function on the resolver
      const address = await client.readContract({
        address: resolverAddr,
        abi: ENS_RESOLVER_ABI,
        functionName: 'addr',
        args: [nameNode],
      });

      // If no address is set, return null
      if (address === '0x0000000000000000000000000000000000000000') {
        console.warn(`No address set for ${name}`);
        return null;
      }

      return address;
    } catch (error) {
      console.warn(`Error resolving Base Name ${name}:`, error);
      return null;
    }
  } catch (error) {
    console.error('Error resolving Base Name:', error);
    return null;
  }
}

/**
 * Looks up a Base Name for an Ethereum address
 * @param {string} address - The Ethereum address to look up
 * @param {boolean} useTestnet - Whether to use testnet or mainnet resolution
 * @returns {Promise<string|null>} - The Base Name or null if not found
 */
export async function lookupBaseName(address, useTestnet = false) {
  try {
    console.log(`lookupBaseName called for ${address} (testnet: ${useTestnet})`);
    
    // Check if the address is valid
    if (!isAddress(address)) {
      console.warn(`Invalid address format provided to lookupBaseName: ${address}`);
      return null;
    }

    // Normalize the address
    address = address.toLowerCase();

    // Select the appropriate client and registry address based on the network
    const client = useTestnet ? baseSepoliaClient : baseClient;
    const registryAddress = useTestnet ? VALIDATED_REGISTRY_SEPOLIA : VALIDATED_REGISTRY_MAINNET;
    const reverseRegistrarAddress = useTestnet ?
      BASE_NAME_REVERSE_REGISTRAR_SEPOLIA :
      BASE_NAME_REVERSE_REGISTRAR_MAINNET;

    if (!isValidAddress(registryAddress)) {
      console.warn(`Invalid registry address for ${useTestnet ? 'testnet' : 'mainnet'}: ${registryAddress}`);
      return null;
    }

    try {
      // Construct the reverse lookup name: address.addr.reverse
      const reverseName = `${address.substring(2)}.addr.reverse`;
      console.log(`Constructed reverse name: ${reverseName}`);
      
      const reverseNode = namehash(reverseName);
      console.log(`Reverse namehash: ${reverseNode}`);

      console.log(`Looking up resolver for reverse node at registry: ${registryAddress}`);

      // Get the resolver for this reverse node
      const resolverAddr = await client.readContract({
        address: registryAddress,
        abi: ENS_REGISTRY_ABI,
        functionName: 'resolver',
        args: [reverseNode],
      });
      console.log(`Found resolver address: ${resolverAddr}`);

      // If no resolver is set, return null
      if (!resolverAddr || resolverAddr === '0x0000000000000000000000000000000000000000') {
        console.warn(`No reverse resolver set for ${address}`);
        return null;
      }

      console.log(`Calling name() on resolver: ${resolverAddr}`);

      // Call the name function on the resolver
      const name = await client.readContract({
        address: resolverAddr,
        abi: ENS_RESOLVER_ABI,
        functionName: 'name',
        args: [reverseNode],
      });
      console.log(`Resolver returned name: ${name || 'null'}`);

      // If no name is set or if it's not a valid .base name, return null
      if (!name) {
        console.log(`No name found for address ${address}`);
        return null;
      }
      
      if (!isBaseName(name)) {
        console.log(`Found name ${name} is not a valid Base name for address ${address}`);
        return null;
      }

      console.log(`Successfully resolved ${address} to ${name}`);
      return name;
    } catch (error) {
      console.warn(`Error looking up Base Name for ${address}:`, error);
      // Log more details about the error
      if (error.message) console.warn(`Error message: ${error.message}`);
      if (error.code) console.warn(`Error code: ${error.code}`);
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
  
  // If it's a base name, return it as is
  if (isBaseName(addressOrName)) {
    return addressOrName;
  }
  
  // If it's an address, format it
  if (isAddress(addressOrName)) {
    return `${addressOrName.slice(0, prefixLength)}...${addressOrName.slice(-suffixLength)}`;
  }
  
  // If it's neither a base name nor an address, return it as is
  return addressOrName;
}

/**
 * Generate a deterministic address from a name (for fallback)
 * This function is kept only for compatibility with existing code
 * @param {string} name - The name to generate an address for
 * @returns {string} - A deterministic Ethereum address
 * @deprecated - Use resolveBaseName instead
 */
function generateDeterministicAddress(name) {
  console.warn('generateDeterministicAddress is deprecated, use resolveBaseName instead');
  return `0x${keccak256(stringToHex(name)).slice(2, 42)}`;
}
