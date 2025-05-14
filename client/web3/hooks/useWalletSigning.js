"use client"

import { useState, useCallback } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { supabase } from '@/utils/supabase'

/**
 * Custom hook for wallet message signing functionality
 * Provides methods to sign messages and verify wallet ownership
 */
export function useWalletSigning() {
  const { address, isConnected } = useAccount()
  const [isVerifying, setIsVerifying] = useState(false)
  const [isVerified, setIsVerified] = useState(false)
  const [verificationError, setVerificationError] = useState(null)

  // Use wagmi's useSignMessage hook
  const { signMessage, isPending: isSignPending, error: signError } = useSignMessage()

  /**
   * Generate a verification message for the user to sign
   * @param {string} address - User's wallet address
   * @returns {string} - Message to sign
   */
  const generateVerificationMessage = useCallback((address) => {
    const timestamp = new Date().toISOString()
    return `Welcome to LucraAI!\n\nPlease sign this message to verify your wallet ownership and enable secure transactions.\n\nThis signature will not trigger a blockchain transaction or cost any gas fees.\n\nWallet: ${address}\nTimestamp: ${timestamp}`
  }, [])

  /**
   * Verify wallet ownership by signing a message
   * @param {string} address - User's wallet address
   * @returns {Promise<boolean>} - Whether verification was successful
   */
  const verifyWalletOwnership = useCallback(async (address) => {
    try {
      setIsVerifying(true)
      setVerificationError(null)

      // Generate the message to sign
      const message = generateVerificationMessage(address)

      // Request the user to sign the message
      const signature = await signMessage({ message })

      if (!signature) {
        throw new Error('Failed to sign message')
      }

      // Store the signature in Supabase
      const { error } = await supabase
        .from('wallet_signatures')
        .upsert([
          {
            wallet_address: address,
            signature,
            message,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])

      if (error) {
        console.error('Error storing signature:', error)
        throw new Error('Failed to store signature')
      }

      // Update the user record to mark as verified
      const { error: userError } = await supabase
        .from('users')
        .update({
          is_verified: true,
          updated_at: new Date().toISOString()
        })
        .eq('wallet_address', address)

      if (userError) {
        console.error('Error updating user verification status:', userError)
        // Don't throw here, as the signature was stored successfully
      }

      setIsVerified(true)
      return true
    } catch (error) {
      console.error('Error verifying wallet ownership:', error)
      setVerificationError(error.message || 'Failed to verify wallet ownership')
      return false
    } finally {
      setIsVerifying(false)
    }
  }, [generateVerificationMessage, signMessage])

  /**
   * Check if a wallet has been verified
   * @param {string} address - User's wallet address
   * @returns {Promise<boolean>} - Whether the wallet is verified
   */
  const checkWalletVerification = useCallback(async (address) => {
    try {
      if (!address) return false

      // Check if the wallet has a signature in the database
      const { data, error } = await supabase
        .from('wallet_signatures')
        .select('*')
        .eq('wallet_address', address)
        .single()

      if (error) {
        console.error('Error checking wallet verification:', error)
        return false
      }

      // If we have a signature, the wallet is verified
      const verified = !!data
      setIsVerified(verified)
      return verified
    } catch (error) {
      console.error('Error checking wallet verification:', error)
      return false
    }
  }, [])

  return {
    verifyWalletOwnership,
    checkWalletVerification,
    isVerifying,
    isVerified,
    isSignPending,
    verificationError,
    signError
  }
}
