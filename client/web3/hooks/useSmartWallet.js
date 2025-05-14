"use client"

import { useState, useEffect, useCallback } from 'react'
import { useAccount, useChainId } from 'wagmi'
import {
  createSmartWallet,
  storeSmartWallet,
  getStoredSmartWallet,
  clearStoredSmartWallet,
  hasStoredSmartWallet,
  getNetworkByChainId,
  BASE_MAINNET,
  BASE_SEPOLIA
} from '../../../web3'

/**
 * Custom hook for Smart Wallet functionality
 * Provides methods to create, manage, and interact with Smart Wallets
 */
export function useSmartWallet() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const [smartWallet, setSmartWallet] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  // Get the current network based on the chain ID
  const network = getNetworkByChainId(chainId) || BASE_MAINNET

  // Load the stored Smart Wallet on mount
  useEffect(() => {
    if (isConnected && address) {
      // Add a small delay to ensure localStorage is accessible
      // This helps prevent race conditions with service worker initialization
      const timer = setTimeout(() => {
        loadSmartWallet()
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [isConnected, address])

  /**
   * Load the stored Smart Wallet
   */
  const loadSmartWallet = useCallback(() => {
    try {
      console.log('Attempting to load Smart Wallet...')
      const storedWallet = getStoredSmartWallet()

      if (storedWallet) {
        console.log('Smart Wallet loaded successfully:', storedWallet.address)
        setSmartWallet(storedWallet)
      } else {
        console.log('No Smart Wallet found in storage')
      }
    } catch (error) {
      console.error('Error loading Smart Wallet:', error)
      setError('Failed to load Smart Wallet')
    }
  }, [])

  /**
   * Create a new Smart Wallet
   * @param {object} options - Options for creating the Smart Wallet
   * @param {string} options.networkId - Network ID (e.g., 'base-mainnet', 'base-sepolia')
   * @returns {Promise<object>} - Smart Wallet object
   */
  const createWallet = useCallback(async (options = {}) => {
    try {
      setIsLoading(true)
      setError(null)

      // Determine the network ID based on the current chain ID
      const networkId = network.id === BASE_SEPOLIA.id ? 'base-sepolia' : 'base-mainnet'

      // Create a new Smart Wallet
      const newWallet = await createSmartWallet({
        networkId: options.networkId || networkId,
        ...options
      })

      // Store the Smart Wallet
      storeSmartWallet(newWallet)

      // Update the state
      setSmartWallet(newWallet)

      return newWallet
    } catch (error) {
      console.error('Error creating Smart Wallet:', error)
      setError('Failed to create Smart Wallet')
      throw error
    } finally {
      setIsLoading(false)
    }
  }, [network.id])

  /**
   * Clear the stored Smart Wallet
   */
  const clearWallet = useCallback(() => {
    try {
      clearStoredSmartWallet()
      setSmartWallet(null)
    } catch (error) {
      console.error('Error clearing Smart Wallet:', error)
      setError('Failed to clear Smart Wallet')
    }
  }, [])

  /**
   * Check if a Smart Wallet exists
   * @returns {boolean} - True if a Smart Wallet exists
   */
  const hasWallet = useCallback(() => {
    return hasStoredSmartWallet()
  }, [])

  return {
    smartWallet,
    isLoading,
    error,
    createWallet,
    clearWallet,
    hasWallet,
    network
  }
}
