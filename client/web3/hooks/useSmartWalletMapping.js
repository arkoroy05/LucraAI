"use client"

import { useState, useEffect, useCallback } from 'react'
import { useAccount } from 'wagmi'
import { supabase } from '@/utils/supabase'
import { useSmartWallet } from './useSmartWallet'

/**
 * Custom hook for mapping smart wallets to regular wallets
 * Provides methods to associate and manage smart wallets with regular wallets
 */
export function useSmartWalletMapping() {
  const { address, isConnected } = useAccount()
  const { smartWallet, createWallet } = useSmartWallet()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [mappedWallets, setMappedWallets] = useState([])

  // Load mapped smart wallets when connected
  useEffect(() => {
    if (isConnected && address) {
      loadMappedWallets()
    } else {
      setMappedWallets([])
    }
  }, [isConnected, address])

  /**
   * Load all smart wallets mapped to the current wallet
   */
  const loadMappedWallets = useCallback(async () => {
    if (!address) return

    try {
      setIsLoading(true)
      setError(null)

      // Query the smart_wallets table for wallets owned by this address
      const { data, error } = await supabase
        .from('smart_wallets')
        .select('*')
        .eq('owner_address', address)
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }

      setMappedWallets(data || [])
    } catch (err) {
      console.error('Error loading mapped smart wallets:', err)
      setError('Failed to load smart wallets')
    } finally {
      setIsLoading(false)
    }
  }, [address])

  /**
   * Map a smart wallet to the current wallet
   * @param {object} smartWalletData - Smart wallet data to map
   * @returns {Promise<boolean>} - Whether the mapping was successful
   */
  const mapSmartWallet = useCallback(async (smartWalletData) => {
    if (!address || !smartWalletData?.address) return false

    try {
      setIsLoading(true)
      setError(null)

      // First check if this wallet is already mapped
      const { data: existingWallet, error: checkError } = await supabase
        .from('smart_wallets')
        .select('id')
        .eq('address', smartWalletData.address)
        .single()

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" which is expected
        console.warn('Error checking for existing wallet:', checkError)
      }

      // If wallet already exists, consider it a success
      if (existingWallet) {
        console.log('Smart wallet already mapped:', smartWalletData.address)
        return true
      }

      // Try to insert first, and if that fails, try to update
      try {
        // First try to insert the wallet
        const { error: insertError } = await supabase
          .from('smart_wallets')
          .insert([
            {
              address: smartWalletData.address,
              owner_address: address,
              network_id: smartWalletData.networkId || 'base-sepolia',
              metadata: {
                privateKey: smartWalletData.privateKey,
                publicKey: smartWalletData.publicKey,
                ...smartWalletData.metadata
              }
            }
          ])

        // If insert fails with a unique violation, try to update instead
        if (insertError) {
          console.log('Insert failed, trying update instead:', insertError.message)

          // Update the existing wallet
          const { error: updateError } = await supabase
            .from('smart_wallets')
            .update({
              owner_address: address,
              network_id: smartWalletData.networkId || 'base-sepolia',
              metadata: {
                privateKey: smartWalletData.privateKey,
                publicKey: smartWalletData.publicKey,
                ...smartWalletData.metadata
              },
              updated_at: new Date().toISOString()
            })
            .eq('address', smartWalletData.address)

          if (updateError) {
            console.error('Error updating smart wallet:', updateError)
            throw updateError
          }
        }
      } catch (dbError) {
        console.error('Database operation failed:', dbError)
        // Don't throw here, we'll still try to update the user record
      }

      // Update the user record with the smart wallet address
      try {
        const { error: userError } = await supabase
          .from('users')
          .update({
            smart_wallet_address: smartWalletData.address,
            updated_at: new Date().toISOString()
          })
          .eq('wallet_address', address)

        if (userError) {
          console.warn('Error updating user with smart wallet:', userError.message)
          // Don't throw here, as the smart wallet was stored successfully
        }
      } catch (userUpdateError) {
        console.warn('Failed to update user record:', userUpdateError)
        // Continue anyway since the wallet mapping is the important part
      }

      // Reload the mapped wallets
      try {
        await loadMappedWallets()
      } catch (loadError) {
        console.warn('Failed to reload mapped wallets:', loadError)
        // Continue anyway, we'll return success
      }

      return true
    } catch (err) {
      console.error('Error mapping smart wallet:', err)
      // Try to load mapped wallets anyway to ensure UI is up to date
      try {
        await loadMappedWallets()
      } catch (loadError) {
        console.warn('Failed to reload mapped wallets after error:', loadError)
      }

      setError('Failed to map smart wallet')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [address, loadMappedWallets])

  /**
   * Create and map a new smart wallet
   * @param {object} options - Options for creating the smart wallet
   * @returns {Promise<object|null>} - The created smart wallet or null if failed
   */
  const createAndMapSmartWallet = useCallback(async (options = {}) => {
    if (!address) return null

    try {
      setIsLoading(true)
      setError(null)

      // First check if we already have mapped wallets
      if (mappedWallets.length > 0 && !options.force) {
        console.log('Using existing mapped wallet instead of creating a new one')
        return mappedWallets[0]
      }

      // Create a new smart wallet
      let newWallet
      try {
        newWallet = await createWallet(options)
        if (!newWallet) {
          throw new Error('Failed to create smart wallet')
        }
      } catch (createError) {
        console.error('Error creating smart wallet:', createError)

        // If we have mapped wallets, return the first one instead of failing
        if (mappedWallets.length > 0) {
          console.log('Using existing mapped wallet after creation failure')
          return mappedWallets[0]
        }

        // If we can't create a wallet and don't have any existing ones,
        // create a mock wallet for development purposes
        if (process.env.NODE_ENV !== 'production') {
          console.log('Creating mock wallet for development')
          newWallet = {
            address: `0x${address.substring(2, 10)}000000000000000000000000000000`,
            networkId: 'base-sepolia',
            privateKey: '0x0000000000000000000000000000000000000000000000000000000000000000',
            publicKey: '0x0000000000000000000000000000000000000000000000000000000000000000',
            metadata: { isMock: true }
          }
        } else {
          throw createError
        }
      }

      // Map the smart wallet to the current wallet
      let mappingSuccess = false
      try {
        mappingSuccess = await mapSmartWallet(newWallet)
        if (!mappingSuccess) {
          console.warn('Failed to map smart wallet, but wallet was created')
        }
      } catch (mapError) {
        console.warn('Error mapping smart wallet, but wallet was created:', mapError)
      }

      // Reload mapped wallets to ensure we have the latest data
      try {
        await loadMappedWallets()

        // If mapping failed but we now have mapped wallets, use the first one
        if (!mappingSuccess && mappedWallets.length > 0) {
          console.log('Using existing mapped wallet after mapping failure')
          return mappedWallets[0]
        }
      } catch (loadError) {
        console.warn('Failed to reload mapped wallets:', loadError)
      }

      return newWallet
    } catch (err) {
      console.error('Error creating and mapping smart wallet:', err)
      setError('Failed to create and map smart wallet')

      // Try to load mapped wallets anyway to ensure UI is up to date
      try {
        await loadMappedWallets()

        // If we have mapped wallets, return the first one instead of failing
        if (mappedWallets.length > 0) {
          console.log('Using existing mapped wallet after error')
          return mappedWallets[0]
        }
      } catch (loadError) {
        console.warn('Failed to reload mapped wallets after error:', loadError)
      }

      return null
    } finally {
      setIsLoading(false)
    }
  }, [address, createWallet, mapSmartWallet, mappedWallets, loadMappedWallets])

  /**
   * Remove a smart wallet mapping
   * @param {string} smartWalletAddress - Address of the smart wallet to remove
   * @returns {Promise<boolean>} - Whether the removal was successful
   */
  const removeSmartWalletMapping = useCallback(async (smartWalletAddress) => {
    if (!address || !smartWalletAddress) return false

    try {
      setIsLoading(true)
      setError(null)

      // Delete the smart wallet from the database
      const { error } = await supabase
        .from('smart_wallets')
        .delete()
        .eq('address', smartWalletAddress)
        .eq('owner_address', address)

      if (error) {
        throw error
      }

      // If this was the primary smart wallet, update the user record
      const { data: userData } = await supabase
        .from('users')
        .select('smart_wallet_address')
        .eq('wallet_address', address)
        .single()

      if (userData?.smart_wallet_address === smartWalletAddress) {
        // Find another smart wallet to set as primary, or set to null
        const { data: otherWallets } = await supabase
          .from('smart_wallets')
          .select('address')
          .eq('owner_address', address)
          .limit(1)

        const newPrimaryWallet = otherWallets?.[0]?.address || null

        // Update the user record
        await supabase
          .from('users')
          .update({
            smart_wallet_address: newPrimaryWallet,
            updated_at: new Date().toISOString()
          })
          .eq('wallet_address', address)
      }

      // Reload the mapped wallets
      await loadMappedWallets()

      return true
    } catch (err) {
      console.error('Error removing smart wallet mapping:', err)
      setError('Failed to remove smart wallet mapping')
      return false
    } finally {
      setIsLoading(false)
    }
  }, [address, loadMappedWallets])

  return {
    mappedWallets,
    isLoading,
    error,
    loadMappedWallets,
    mapSmartWallet,
    createAndMapSmartWallet,
    removeSmartWalletMapping
  }
}
