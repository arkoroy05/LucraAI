"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { lookupBaseName, isBaseName } from '../utils/baseNameService'
import { getNetworkByChainId, BASE_SEPOLIA } from '../config/networks'

/**
 * Custom hook for Base Name resolution
 * Provides methods to resolve Base Names to addresses and vice versa
 */
export function useBaseName() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const [baseName, setBaseName] = useState(null)
  const [smartWalletBaseName, setSmartWalletBaseName] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [addressCache, setAddressCache] = useState({})
  const [nameCache, setNameCache] = useState({})

  // Track if the component is mounted to prevent state updates after unmount
  const isMounted = useRef(true)

  // Known address to BaseName mappings (fallback when reverse resolution fails)
  const knownAddresses = {
    // Add known addresses and their baseNames here (all lowercase)
    // Format: 'address': 'name.base'
    // Empty by default - we'll use the actual Base Name Service for resolution
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  // Get the current network based on the chain ID
  const network = getNetworkByChainId(chainId) || BASE_SEPOLIA

  // Always use mainnet for basename resolution for production addresses
  const isTestnet = network?.name.toLowerCase().includes('sepolia')

  /**
   * Resolve a Base Name to an Ethereum address
   * @param {string} name - Base Name to resolve
   * @returns {Promise<string|null>} - Resolved Ethereum address or null if not found
   */
  const resolveName = useCallback(async (name) => {
    if (!name) return null

    // If the input is already an address, return it
    if (typeof name === 'string' && /^0x[a-fA-F0-9]{40}$/.test(name)) {
      return name
    }

    // Ensure name has .base suffix
    if (typeof name === 'string' && !name.endsWith('.base')) {
      name = `${name}.base`
    }

    try {
      if (isMounted.current) setIsLoading(true)
      if (isMounted.current) setError(null)

      // Check cache first
      if (addressCache[name]) {
        console.log(`Cache hit for ${name}: ${addressCache[name]}`)
        return addressCache[name]
      }

      console.log(`Resolving Base Name: ${name} (using mainnet)`)

      // We don't have a resolver function in our implementation yet
      // This would need to be implemented in baseNameService.js
      console.log(`Base Name resolution not implemented yet`)

      return null
    } catch (err) {
      console.error('Error resolving Base Name:', err)
      if (isMounted.current) setError('Failed to resolve Base Name')
      return null
    } finally {
      if (isMounted.current) setIsLoading(false)
    }
  }, [addressCache])

  /**
   * Look up the Base Name for an Ethereum address
   * @param {string} addr - Ethereum address to look up
   * @returns {Promise<string|null>} - Base Name or null if not found
   */
  const lookupAddress = useCallback(async (addr) => {
    if (!addr) return null

    // Validate address format
    if (typeof addr !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      console.warn(`Invalid address format: ${addr}`)
      return null
    }

    try {
      if (isMounted.current) setIsLoading(true)
      if (isMounted.current) setError(null)

      // Normalize the address for cache lookups
      const normalizedAddr = addr.toLowerCase();

      // Check cache first
      if (nameCache[normalizedAddr]) {
        console.log(`Cache hit for ${addr}: ${nameCache[normalizedAddr]}`)
        return nameCache[normalizedAddr]
      }

      // Check known addresses mapping if we have it
      if (knownAddresses[normalizedAddr]) {
        console.log(`Found known address mapping for ${addr}: ${knownAddresses[normalizedAddr]}`);

        // Update cache if component is still mounted
        if (isMounted.current) {
          setNameCache(prev => ({
            ...prev,
            [normalizedAddr]: knownAddresses[normalizedAddr]
          }));
        }

        return knownAddresses[normalizedAddr];
      }

      console.log(`Looking up Base Name for address: ${addr} (using mainnet)`)

      // Look up the address using onchain resolution - always use mainnet
      const name = await lookupBaseName(addr)
      console.log(`Looked up ${addr} to ${name || 'null'}`)

      // Update cache if component is still mounted
      if (name && isMounted.current) {
        setNameCache(prev => ({ ...prev, [normalizedAddr]: name }))
      }

      return name
    } catch (err) {
      console.error('Error looking up Base Name:', err)
      if (isMounted.current) setError('Failed to look up Base Name')
      return null
    } finally {
      if (isMounted.current) setIsLoading(false)
    }
  }, [nameCache, knownAddresses])

  /**
   * Check if a string is a valid Base Name
   * @param {string} name - Name to check
   * @returns {boolean} - True if the name is a valid Base Name
   */
  const checkIsBaseName = useCallback((name) => {
    return isBaseName(name)
  }, [])

  // Look up the Base Name for the connected wallet
  useEffect(() => {
    // Skip if not connected or no address
    if (!isConnected || !address) {
      if (isMounted.current) {
        setBaseName(null)
      }
      return
    }

    // Skip if we already have a cached name in our state
    if (baseName) {
      return
    }

    // Check if we have the name in our cache
    const normalizedAddr = address.toLowerCase()
    if (nameCache[normalizedAddr]) {
      if (isMounted.current) {
        setBaseName(nameCache[normalizedAddr])
      }
      return
    }

    // Only do the lookup if we don't have it cached
    lookupAddress(address)
      .then(name => {
        if (name && isMounted.current) {
          setBaseName(name)
        } else if (isMounted.current) {
          setBaseName(null)
        }
      })
      .catch(err => {
        console.error('Error looking up Base Name for connected wallet:', err)
        if (isMounted.current) {
          setBaseName(null)
        }
      })
  }, [isConnected, address, lookupAddress, nameCache, baseName])

  // Look up the Base Name for a smart wallet
  const lookupSmartWalletName = useCallback(async (smartWalletAddress) => {
    if (!smartWalletAddress) {
      return null
    }

    try {
      // First check if we already have a cached basename for the smart wallet
      if (smartWalletBaseName) {
        return smartWalletBaseName
      }

      // Check if we have it in our cache
      const normalizedAddr = smartWalletAddress.toLowerCase()
      if (nameCache[normalizedAddr]) {
        if (isMounted.current) {
          setSmartWalletBaseName(nameCache[normalizedAddr])
        }
        return nameCache[normalizedAddr]
      }

      // First check if we already have a cached basename for the connected wallet
      // This is a common case where the smart wallet inherits the basename from the owner
      if (baseName) {
        console.log(`Using connected wallet's basename (${baseName}) for smart wallet display`);
        setSmartWalletBaseName(baseName);
        return baseName;
      }

      // Otherwise look up the smart wallet address
      const name = await lookupAddress(smartWalletAddress)
      if (name && isMounted.current) {
        setSmartWalletBaseName(name)
        return name
      } else if (isMounted.current) {
        setSmartWalletBaseName(null)
        return null
      }
    } catch (err) {
      console.error('Error looking up Base Name for smart wallet:', err)
      if (isMounted.current) {
        setSmartWalletBaseName(null)
      }
      return null
    }

    return null
  }, [lookupAddress, baseName, nameCache, smartWalletBaseName])

  return {
    baseName,
    smartWalletBaseName,
    isLoading,
    error,
    resolveName,
    lookupAddress,
    lookupSmartWalletName,
    isBaseName: checkIsBaseName,
    addressCache,
    nameCache,
    isTestnet
  }
}
