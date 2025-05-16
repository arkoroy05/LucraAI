import { createPublicClient, http, namehash, keccak256, encodePacked, isAddress } from 'viem'
import { base, mainnet } from 'viem/chains'
import L2ResolverAbi from '@/abis/L2ResolverAbi'

// Base Name Service L2 Resolver address on mainnet
export const BASENAME_L2_RESOLVER_ADDRESS = "0xC6d566A56A1aFf6508b41f6c90ff131615583BCD"

// In-memory cache for basename lookups to prevent excessive RPC calls
const basenameCache = new Map()

// Create a public client for Base mainnet with retry logic
const baseClient = createPublicClient({
  chain: base,
  transport: http("https://mainnet.base.org", {
    retryCount: 3,
    retryDelay: 1000,
    timeout: 10000,
  }),
})

// Fallback public client using a different RPC endpoint
const fallbackClient = createPublicClient({
  chain: base,
  transport: http("https://base.llamarpc.com", {
    retryCount: 2,
    retryDelay: 1000,
    timeout: 10000,
  }),
})

/**
 * Convert a chainId to a coinType hex for reverse chain resolution
 */
export const convertChainIdToCoinType = (chainId) => {
  // L1 resolvers to addr
  if (chainId === mainnet.id) {
    return "addr"
  }
  const cointype = (0x80000000 | chainId) >>> 0
  return cointype.toString(16).toLocaleUpperCase()
}

/**
 * Convert an address to a reverse node for ENS resolution
 */
export const convertReverseNodeToBytes = (address, chainId) => {
  const addressFormatted = address.toLowerCase()
  const addressNode = keccak256(addressFormatted.substring(2))
  const chainCoinType = convertChainIdToCoinType(chainId)
  const baseReverseNode = namehash(`${chainCoinType.toLocaleUpperCase()}.reverse`)
  const addressReverseNode = keccak256(
    encodePacked(["bytes32", "bytes32"], [baseReverseNode, addressNode])
  )
  return addressReverseNode
}

/**
 * Lookup a Base Name for an Ethereum address
 * @param {string} address - The Ethereum address to lookup
 * @returns {Promise<string|null>} - The Base Name or null if not found
 */
export async function lookupBaseName(address) {
  try {
    // Validate address
    if (!isAddress(address)) {
      console.warn(`Invalid address format provided to lookupBaseName: ${address}`)
      return null
    }

    // Normalize the address
    const normalizedAddress = address.toLowerCase()

    // Check cache first to avoid unnecessary RPC calls
    if (basenameCache.has(normalizedAddress)) {
      const cachedResult = basenameCache.get(normalizedAddress)
      console.log(`Cache hit for ${normalizedAddress}: ${cachedResult || 'null'}`)
      return cachedResult
    }

    console.log(`Looking up Base Name for address: ${address} (using mainnet)`)

    // Always use mainnet for basename resolution
    const addressReverseNode = convertReverseNodeToBytes(normalizedAddress, base.id)

    try {
      // Call the name function on the resolver
      const basename = await baseClient.readContract({
        abi: L2ResolverAbi,
        address: BASENAME_L2_RESOLVER_ADDRESS,
        functionName: "name",
        args: [addressReverseNode],
      })

      console.log(`Looked up ${address} to ${basename || 'null'}`)

      // Cache the result (even if null) to prevent future lookups
      basenameCache.set(normalizedAddress, basename)

      return basename || null
    } catch (error) {
      // If we hit rate limits, try the fallback client
      if (error.message && (error.message.includes('rate limit') || error.message.includes('429'))) {
        console.warn('Rate limit hit, using fallback RPC endpoint')
        try {
          const basename = await fallbackClient.readContract({
            abi: L2ResolverAbi,
            address: BASENAME_L2_RESOLVER_ADDRESS,
            functionName: "name",
            args: [addressReverseNode],
          })

          console.log(`Fallback lookup for ${address} returned ${basename || 'null'}`)

          // Cache the result
          basenameCache.set(normalizedAddress, basename)

          return basename || null
        } catch (fallbackError) {
          console.error('Fallback lookup also failed:', fallbackError)
          // Cache a null result to prevent repeated failures
          basenameCache.set(normalizedAddress, null)
          return null
        }
      }

      console.error('Error looking up Base Name:', error)
      // Cache a null result to prevent repeated failures
      basenameCache.set(normalizedAddress, null)
      return null
    }
  } catch (error) {
    console.error('Unexpected error in lookupBaseName:', error)
    return null
  }
}

/**
 * Get a text record for a Base Name
 * @param {string} basename - The Base Name
 * @param {string} key - The text record key
 * @returns {Promise<string|null>} - The text record value or null if not found
 */
export async function getBasenameTextRecord(basename, key) {
  try {
    if (!basename) return null

    const textRecord = await baseClient.readContract({
      abi: L2ResolverAbi,
      address: BASENAME_L2_RESOLVER_ADDRESS,
      functionName: "text",
      args: [namehash(basename), key],
    })

    return textRecord || null
  } catch (error) {
    console.error(`Error getting text record ${key} for ${basename}:`, error)
    return null
  }
}

/**
 * Checks if a string is a valid Base Name
 * @param {string} name - Name to check
 * @returns {boolean} - True if the name is a valid Base Name
 */
export function isBaseName(name) {
  return typeof name === 'string' && (name.endsWith('.base') || name.endsWith('.base.eth'))
}

/**
 * Format an address or name for display
 * @param {string} addressOrName - Address or name to format
 * @param {number} prefixLength - Number of characters to show at the beginning of an address
 * @param {number} suffixLength - Number of characters to show at the end of an address
 * @returns {string} - Formatted address or name
 */
export function formatAddressOrName(addressOrName, prefixLength = 6, suffixLength = 4) {
  if (!addressOrName) return '';

  if (isBaseName(addressOrName)) {
    return addressOrName;
  }

  if (typeof addressOrName === 'string' && /^0x[a-fA-F0-9]{40}$/.test(addressOrName)) {
    return `${addressOrName.slice(0, prefixLength)}...${addressOrName.slice(-suffixLength)}`;
  }

  return addressOrName;
}
