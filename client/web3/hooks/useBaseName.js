"use client"

import { useState, useEffect, useCallback } from 'react'
import { useAccount, useChainId } from 'wagmi'
import { resolveBaseName, lookupBaseName } from '../utils/baseNameResolver'
import { getNetworkByChainId, BASE_SEPOLIA } from '..'

/**
 * Custom hook for Base Name resolution
 * Provides methods to resolve Base Names to addresses and vice versa
 */
export function useBaseName() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const [baseName, setBaseName] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [addressCache, setAddressCache] = useState({})
  const [nameCache, setNameCache] = useState({})

  // Get the current network based on the chain ID
  const network = getNetworkByChainId(chainId) || BASE_SEPOLIA

  // Determine if we're on a testnet
  const isTestnet = network.id === BASE_SEPOLIA.id || network.name.toLowerCase().includes('sepolia')

  /**
   * Resolve a Base Name to an Ethereum address
   * @param {string} name - Base Name to resolve
   * @returns {Promise<string|null>} - Resolved Ethereum address or null if not found
   */
  const resolveName = useCallback(async (name) => {
    if (!name) return null

    try {
      setIsLoading(true)
      setError(null)

      // Check cache first
      if (addressCache[name]) {
        return addressCache[name]
      }

      // Resolve the name
      const resolvedAddress = await resolveBaseName(name, isTestnet)

      // Update cache
      if (resolvedAddress) {
        setAddressCache(prev => ({ ...prev, [name]: resolvedAddress }))
      }

      return resolvedAddress
    } catch (err) {
      console.error('Error resolving Base Name:', err)
      setError('Failed to resolve Base Name')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [addressCache, isTestnet])

  /**
   * Look up the Base Name for an Ethereum address
   * @param {string} addr - Ethereum address to look up
   * @returns {Promise<string|null>} - Base Name or null if not found
   */
  const lookupAddress = useCallback(async (addr) => {
    if (!addr) return null

    try {
      setIsLoading(true)
      setError(null)

      // Check cache first
      if (nameCache[addr]) {
        return nameCache[addr]
      }

      // Look up the address
      const name = await lookupBaseName(addr, isTestnet)

      // Update cache
      if (name) {
        setNameCache(prev => ({ ...prev, [addr]: name }))
      }

      return name
    } catch (err) {
      console.error('Error looking up Base Name:', err)
      setError('Failed to look up Base Name')
      return null
    } finally {
      setIsLoading(false)
    }
  }, [nameCache, isTestnet])

  // Look up the Base Name for the connected wallet
  useEffect(() => {
    if (isConnected && address) {
      lookupAddress(address)
        .then(name => {
          if (name) {
            setBaseName(name)
          }
        })
        .catch(err => {
          console.error('Error looking up Base Name for connected wallet:', err)
        })
    } else {
      setBaseName(null)
    }
  }, [isConnected, address, lookupAddress])

  return {
    baseName,
    isLoading,
    error,
    resolveName,
    lookupAddress,
    addressCache,
    nameCache
  }
}
