"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { resolveBaseName, lookupBaseName, isBaseName } from '../utils/baseNameResolver'
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
    '0xe87758c6cccf3806c9f1f0c8f99f6dcae36e5449': 'demo.base',
    '0xb9b9b9bf673a9813bf04a92ebc1661cc25bc00f6': 'smartwallet.base',
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

      console.log(`Resolving Base Name: ${name} (testnet: ${isTestnet})`)

      // Resolve the name
      const resolvedAddress = await resolveBaseName(name, isTestnet)
      console.log(`Resolved ${name} to ${resolvedAddress || 'null'}`)

      // Update cache if component is still mounted
      if (resolvedAddress && isMounted.current) {
        setAddressCache(prev => ({ ...prev, [name]: resolvedAddress }))
      }

      return resolvedAddress
    } catch (err) {
      console.error('Error resolving Base Name:', err)
      if (isMounted.current) setError('Failed to resolve Base Name')
      return null
    } finally {
      if (isMounted.current) setIsLoading(false)
    }
  }, [addressCache, isTestnet])

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

      console.log(`Looking up Base Name for address: ${addr} (testnet: ${isTestnet})`)

      // Look up the address using onchain resolution
      const name = await lookupBaseName(addr, isTestnet)
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
  }, [nameCache, isTestnet, knownAddresses])

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
    if (isConnected && address) {
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
    } else if (isMounted.current) {
      setBaseName(null)
    }
  }, [isConnected, address, lookupAddress])

  // Look up the Base Name for a smart wallet
  const lookupSmartWalletName = useCallback(async (smartWalletAddress) => {
    if (smartWalletAddress) {
      try {
        // First check if we already have a cached basename for the connected wallet
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
    }
    return null
  }, [lookupAddress, baseName])

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
