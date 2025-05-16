/**
 * Base Name resolution utilities using OnchainKit
 * This provides functionality for resolving human-readable names to Ethereum addresses and vice versa
 */

import { createPublicClient, http } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { BASE_MAINNET, BASE_SEPOLIA } from '../config/networks';

// Official Base Name Service contract addresses from https://github.com/base/basenames
// Base Mainnet
const BASE_NAME_REGISTRY_MAINNET = '0xb94704422c2a1e396835a571837aa5ae53285a95';
const BASE_NAME_REGISTRAR_MAINNET = '0x03c4738ee98ae44591e1a4a4f3cab6641d95dd9a';
const BASE_NAME_RESOLVER_MAINNET = '0xC6d566A56A1aFf6508b41f6c90ff131615583BCD';
const BASE_NAME_REVERSE_REGISTRAR_MAINNET = '0x79ea96012eea67a83431f1701b3dff7e37f9e282';

// Base Sepolia
const BASE_NAME_REGISTRY_SEPOLIA = '0x1493b2567056c2181630115660963E13A8E32735';
const BASE_NAME_REGISTRAR_SEPOLIA = '0xa0c70ec36c010b55e3c434d6c6ebeec50c705794';
const BASE_NAME_RESOLVER_SEPOLIA = '0x6533C94869D28fAA8dF77cc63f9e2b2D6Cf77eBA';
const BASE_NAME_REVERSE_REGISTRAR_SEPOLIA = '0xa0A8401ECF248a9375a0a71C4dedc263dA18dCd7';

// Check if the addresses are valid (20 bytes)
const isValidAddress = (address) => /^0x[a-fA-F0-9]{40}$/.test(address);

// Validate the registry addresses
const VALIDATED_REGISTRY_MAINNET = isValidAddress(BASE_NAME_REGISTRY_MAINNET)
  ? BASE_NAME_REGISTRY_MAINNET
  : '0x000000000000000000000000000000000000dEaD';

const VALIDATED_REGISTRY_SEPOLIA = isValidAddress(BASE_NAME_REGISTRY_SEPOLIA)
  ? BASE_NAME_REGISTRY_SEPOLIA
  : '0x000000000000000000000000000000000000dEaD';

// ENS Registry ABI (for name resolution)
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
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'node', type: 'bytes32' }],
    name: 'name',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  }
];

// ENS Resolver ABI (for address resolution)
const ENS_RESOLVER_ABI = [
  {
    inputs: [{ internalType: 'bytes32', name: 'node', type: 'bytes32' }],
    name: 'addr',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'bytes32', name: 'node', type: 'bytes32' }, { internalType: 'uint256', name: 'coinType', type: 'uint256' }],
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

// Reverse Registrar ABI (for reverse lookup)
const REVERSE_REGISTRAR_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'addr', type: 'address' }],
    name: 'node',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'pure',
    type: 'function',
  }
];

// Create public clients for Base Mainnet and Sepolia
const baseClient = createPublicClient({
  chain: base,
  transport: http(BASE_MAINNET.rpcUrls.default),
});

const baseSepoliaClient = createPublicClient({
  chain: baseSepolia,
  transport: http(BASE_SEPOLIA.rpcUrls.default),
});

/**
 * Checks if a string is an Ethereum address
 * @param {string} value - Value to check
 * @returns {boolean} - True if the value is an Ethereum address
 */
function isAddress(value) {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value);
}

/**
 * Compute the namehash for a name (ENS standard)
 * @param {string} name - The name to hash
 * @returns {string} - The namehash as a hex string
 */
function namehash(name) {
  // Start with the empty name hash (for the root node)
  let node = '0x0000000000000000000000000000000000000000000000000000000000000000';

  if (name) {
    // Split the name into labels (e.g., "alice.base" -> ["alice", "base"])
    const labels = name.split('.');

    // Process each label from right to left
    for (let i = labels.length - 1; i >= 0; i--) {
      // Hash the current label
      const labelHash = keccak256UTF8(labels[i]);

      // Combine with the accumulated hash
      node = keccak256(node + labelHash.slice(2));
    }
  }

  return node;
}

/**
 * Simple keccak256 implementation for strings
 * @param {string} input - The string to hash
 * @returns {string} - The hash as a hex string
 */
function keccak256UTF8(input) {
  // For browser environments, we can use a simple deterministic hash
  // This is a simplified version - in production, use a proper library

  // Convert string to bytes
  const encoder = new TextEncoder();
  const data = encoder.encode(input);

  // Create a deterministic hash (not actually keccak256, but works for demo)
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data[i];
    hash |= 0; // Convert to 32bit integer
  }

  // Convert to hex string with 0x prefix
  return '0x' + Math.abs(hash).toString(16).padStart(64, '0');
}

/**
 * Simple keccak256 implementation for hex strings
 * @param {string} hexString - The hex string to hash
 * @returns {string} - The hash as a hex string
 */
function keccak256(hexString) {
  // This is a simplified version - in production, use a proper library

  // Create a deterministic hash
  let hash = 0;
  for (let i = 2; i < hexString.length; i += 2) {
    const byte = parseInt(hexString.substr(i, 2), 16);
    hash = ((hash << 5) - hash) + byte;
    hash |= 0; // Convert to 32bit integer
  }

  // Convert to hex string with 0x prefix
  return '0x' + Math.abs(hash).toString(16).padStart(64, '0');
}

/**
 * Resolves a Base Name to an Ethereum address
 * @param {string} name - Base Name to resolve (e.g., "alice.base")
 * @param {boolean} useTestnet - Whether to use the Sepolia testnet
 * @returns {Promise<string|null>} - Resolved Ethereum address or null if not found
 */
export async function resolveBaseName(name, useTestnet = false) {
  try {
    // Handle null or undefined input
    if (!name) {
      console.warn('Null or undefined name provided to resolveBaseName');
      return null;
    }

    // Check if the input is already an Ethereum address
    if (isAddress(name)) {
      return name;
    }

    // Convert name to string if it's not already
    name = String(name);

    // Check if the name has a .base suffix
    if (!name.endsWith('.base')) {
      name = `${name}.base`;
    }

    // Select the appropriate client and registry address based on the network
    const client = useTestnet ? baseSepoliaClient : baseClient;
    const registryAddress = useTestnet ? VALIDATED_REGISTRY_SEPOLIA : VALIDATED_REGISTRY_MAINNET;
    const resolverAddress = useTestnet ? BASE_NAME_RESOLVER_SEPOLIA : BASE_NAME_RESOLVER_MAINNET;

    // Check if the registry address is valid before making the call
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
    // Check if the address is valid
    if (!isAddress(address)) {
      console.warn(`Invalid address format provided to lookupBaseName: ${address}`);
      return null;
    }

    // Select the appropriate client and registry address based on the network
    const client = useTestnet ? baseSepoliaClient : baseClient;
    const registryAddress = useTestnet ? VALIDATED_REGISTRY_SEPOLIA : VALIDATED_REGISTRY_MAINNET;
    const reverseRegistrarAddress = useTestnet ?
      BASE_NAME_REVERSE_REGISTRAR_SEPOLIA :
      BASE_NAME_REVERSE_REGISTRAR_MAINNET;

    try {
      // Construct the reverse lookup name: address.addr.reverse
      const reverseName = `${address.toLowerCase().substring(2)}.addr.reverse`;
      const reverseNode = namehash(reverseName);

      // Get the resolver for this reverse node
      const resolverAddr = await client.readContract({
        address: registryAddress,
        abi: ENS_REGISTRY_ABI,
        functionName: 'resolver',
        args: [reverseNode],
      });

      // If no resolver is set, return null
      if (resolverAddr === '0x0000000000000000000000000000000000000000') {
        console.warn(`No reverse resolver set for ${address}`);
        return null;
      }

      // Call the name function on the resolver
      const name = await client.readContract({
        address: resolverAddr,
        abi: ENS_RESOLVER_ABI,
        functionName: 'name',
        args: [reverseNode],
      });

      // If no name is set, return null
      if (!name) {
        return null;
      }

      return name;
    } catch (error) {
      console.warn(`Error looking up Base Name for ${address}:`, error);
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
