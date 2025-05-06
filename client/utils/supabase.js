"use client"

import { createClient } from '@supabase/supabase-js'

// Supabase client for browser-side usage
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://esjxiettkmjomggqobzi.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzanhpZXR0a21qb21nZ3FvYnppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0MjAwNjcsImV4cCI6MjA2MTk5NjA2N30.dLV3mfYlR3h6lnADfqEvPqPeSKp3Lz17OIAw6UJGrnU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Stores a user's wallet address in the database
 * @param {string} walletAddress - The user's wallet address
 * @param {string} walletType - The type of wallet (e.g., 'metamask', 'coinbase')
 * @returns {Promise<Object>} - The result of the database operation
 */
export const storeWalletAddress = async (walletAddress, walletType) => {
  try {
    // First check if the user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single()

    if (existingUser) {
      // User exists, update the last login time
      return await supabase
        .from('users')
        .update({ updated_at: new Date() })
        .eq('wallet_address', walletAddress)
    } else {
      // User doesn't exist, create a new record
      return await supabase
        .from('users')
        .insert([
          {
            wallet_address: walletAddress,
            wallet_type: walletType,
            created_at: new Date(),
            updated_at: new Date()
          }
        ])
    }
  } catch (error) {
    console.error('Error storing wallet address:', error)
    throw error
  }
}

/**
 * Stores a chat message in the database
 * @param {string} walletAddress - The user's wallet address
 * @param {string} message - The message content
 * @param {boolean} isUser - Whether the message is from the user (true) or AI (false)
 * @param {Object} metadata - Additional metadata for the message (optional)
 * @returns {Promise<Object>} - The result of the database operation
 */
export const storeChatMessage = async (walletAddress, message, isUser, metadata = {}) => {
  try {
    // First get the user ID
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single()

    if (!user) {
      throw new Error('User not found')
    }

    return await supabase
      .from('chat_history')
      .insert([
        {
          user_id: user.id,
          message,
          is_user: isUser,
          created_at: new Date(),
          metadata
        }
      ])
  } catch (error) {
    console.error('Error storing chat message:', error)
    throw error
  }
}

/**
 * Stores a transaction in the database
 * @param {string} walletAddress - The user's wallet address
 * @param {string} transactionHash - The transaction hash
 * @param {string} transactionType - The type of transaction (e.g., 'send', 'split')
 * @param {number} amount - The transaction amount
 * @param {string} token - The token symbol (e.g., 'ETH')
 * @param {string} recipientAddress - The recipient's address
 * @param {string} status - The transaction status
 * @param {string} note - Additional note for the transaction (optional)
 * @param {Object} metadata - Additional metadata for the transaction (optional)
 * @returns {Promise<Object>} - The result of the database operation
 */
export const storeTransaction = async (
  walletAddress,
  transactionHash,
  transactionType,
  amount,
  token,
  recipientAddress,
  status,
  note = '',
  metadata = {}
) => {
  try {
    // First get the user ID
    const { data: user } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single()

    if (!user) {
      throw new Error('User not found')
    }

    return await supabase
      .from('transactions')
      .insert([
        {
          user_id: user.id,
          transaction_hash: transactionHash,
          transaction_type: transactionType,
          amount,
          token,
          recipient_address: recipientAddress,
          status,
          note,
          created_at: new Date(),
          updated_at: new Date(),
          metadata
        }
      ])
  } catch (error) {
    console.error('Error storing transaction:', error)
    throw error
  }
}

/**
 * Gets the chat history for a user
 * @param {string} walletAddress - The user's wallet address
 * @param {number} limit - The maximum number of messages to retrieve (default: 50)
 * @returns {Promise<Array>} - The chat history
 */
export const getChatHistory = async (walletAddress, limit = 50) => {
  try {
    if (!walletAddress) return []

    // Call the get_history RPC function
    const { data, error } = await supabase.rpc('get_history', {
      p_wallet_address: walletAddress,
      p_type: 'chat',
      p_limit: limit
    })

    if (error) {
      console.error('Error getting chat history:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error getting chat history:', error)
    return []
  }
}

/**
 * Gets the transaction history for a user
 * @param {string} walletAddress - The user's wallet address
 * @param {number} limit - The maximum number of transactions to retrieve (default: 50)
 * @returns {Promise<Array>} - The transaction history
 */
export const getTransactionHistory = async (walletAddress, limit = 50) => {
  try {
    if (!walletAddress) return []

    // Call the get_history RPC function
    const { data, error } = await supabase.rpc('get_history', {
      p_wallet_address: walletAddress,
      p_type: 'transactions',
      p_limit: limit
    })

    if (error) {
      console.error('Error getting transaction history:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error getting transaction history:', error)
    return []
  }
}

/**
 * Syncs transaction history with Basescan (placeholder for future implementation)
 * @param {string} walletAddress - The user's wallet address
 * @returns {Promise<boolean>} - Whether the sync was successful
 */
export const syncTransactionHistory = async (walletAddress) => {
  // This is a placeholder for future implementation
  // In a real implementation, you would:
  // 1. Fetch transactions from Basescan API
  // 2. Compare with existing transactions in the database
  // 3. Add any new transactions

  try {
    const response = await fetch('/api/transactions/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ walletAddress })
    })

    if (!response.ok) {
      console.error('Error syncing transaction history:', await response.text())
      return false
    }

    return true
  } catch (error) {
    console.error('Error syncing transaction history:', error)
    return false
  }
}

/**
 * Updates a transaction's status
 * @param {string} transactionId - The transaction ID
 * @param {string} transactionHash - The transaction hash
 * @param {string} status - The new status
 * @param {string} walletAddress - The user's wallet address
 * @returns {Promise<Object>} - The result of the update operation
 */
export const updateTransactionStatus = async (transactionId, transactionHash, status, walletAddress) => {
  try {
    if (!transactionId || !status || !walletAddress) {
      return { error: 'Missing required parameters' }
    }

    const response = await fetch('/api/transactions/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        transactionId,
        transactionHash,
        status,
        walletAddress
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      return { error: errorData.error || 'Failed to update transaction status' }
    }

    const data = await response.json()
    return { data }
  } catch (error) {
    console.error('Error updating transaction status:', error)
    return { error }
  }
}
