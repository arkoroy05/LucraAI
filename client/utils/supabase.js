"use client"

import { createClient } from '@supabase/supabase-js'

// Supabase client for browser-side usage
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '')

/**
 * Stores a user's wallet address in the database
 * @param {string} walletAddress - The user's wallet address
 * @param {string} walletType - The type of wallet (e.g., 'metamask', 'coinbase')
 * @returns {Promise<Object>} - The result of the database operation
 */
export const storeWalletAddress = async (walletAddress, walletType) => {
  try {
    if (!walletAddress) {
      console.error('No wallet address provided to storeWalletAddress');
      return { error: 'No wallet address provided' };
    }

    // Normalize the wallet address to lowercase to prevent case-sensitivity issues
    const normalizedAddress = walletAddress.toLowerCase();

    // First check if the user already exists
    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('id, wallet_address')
      .eq('wallet_address', normalizedAddress)

    if (selectError) {
      console.error('Error checking for existing user:', selectError);
      // Continue anyway to try to create the user
    }

    if (existingUser && existingUser.length > 0) {
      // User exists, update the last login time
      console.log('User exists, updating last login time');
      return await supabase
        .from('users')
        .update({
          updated_at: new Date().toISOString(),
          wallet_type: walletType || 'unknown'
        })
        .eq('wallet_address', normalizedAddress)
    } else {
      // User doesn't exist, create a new record
      console.log('User does not exist, creating new record');
      return await supabase
        .from('users')
        .insert([
          {
            wallet_address: normalizedAddress,
            wallet_type: walletType || 'unknown',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
    }
  } catch (error) {
    console.error('Error storing wallet address:', error)
    return { error: error.message || 'Unknown error storing wallet address' }
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
    if (!walletAddress) {
      throw new Error('No wallet address provided');
    }

    // Normalize the wallet address to lowercase
    const normalizedAddress = walletAddress.toLowerCase();

    // First get the user ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', normalizedAddress)
      .maybeSingle();

    if (userError) {
      console.error('Error getting user for chat message:', userError);
      throw new Error('Error getting user: ' + userError.message);
    }

    if (!user) {
      // Create the user if they don't exist
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert([
          {
            wallet_address: normalizedAddress,
            wallet_type: 'wagmi',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select();

      if (insertError) {
        console.error('Error creating user for chat message:', insertError);
        throw new Error('Failed to create user: ' + insertError.message);
      }

      if (!newUser || newUser.length === 0) {
        throw new Error('User not found and could not be created');
      }

      // Use the newly created user
      user = newUser[0];
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
    if (!walletAddress) {
      throw new Error('No wallet address provided');
    }

    // Normalize the wallet address to lowercase
    const normalizedAddress = walletAddress.toLowerCase();

    // First get the user ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('wallet_address', normalizedAddress)
      .maybeSingle();

    if (userError) {
      console.error('Error getting user for transaction:', userError);
      throw new Error('Error getting user: ' + userError.message);
    }

    if (!user) {
      // Create the user if they don't exist
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert([
          {
            wallet_address: normalizedAddress,
            wallet_type: 'wagmi',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select();

      if (insertError) {
        console.error('Error creating user for transaction:', insertError);
        throw new Error('Failed to create user: ' + insertError.message);
      }

      if (!newUser || newUser.length === 0) {
        throw new Error('User not found and could not be created');
      }

      // Use the newly created user
      user = newUser[0];
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
 * Gets the chat conversations for a user
 * @param {string} walletAddress - The user's wallet address
 * @param {number} limit - The maximum number of conversations to retrieve (default: 20)
 * @returns {Promise<Array>} - The chat conversations
 */
export const getChatConversations = async (walletAddress, limit = 20) => {
  try {
    if (!walletAddress) return []

    // Call the get_user_conversations RPC function
    const { data, error } = await supabase.rpc('get_user_conversations', {
      p_wallet_address: walletAddress,
      p_limit: limit
    })

    if (error) {
      // Check if this is a "function not found" error, which can happen if the function was just created
      if (error.message && error.message.includes('function not found')) {
        console.error('Function get_user_conversations not found. It may need to be created in the database.')
      } else {
        console.error('Error getting chat conversations:', error)
      }
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error getting chat conversations:', error)
    return []
  }
}

/**
 * Gets the messages for a specific conversation
 * @param {number} conversationId - The conversation ID
 * @param {number} limit - The maximum number of messages to retrieve (default: 100)
 * @returns {Promise<Array>} - The conversation messages
 */
export const getConversationMessages = async (conversationId, limit = 100) => {
  try {
    if (!conversationId) return []

    // Call the get_conversation_messages RPC function
    const { data, error } = await supabase.rpc('get_conversation_messages', {
      p_conversation_id: conversationId,
      p_limit: limit
    })

    if (error) {
      // Check if this is a "function not found" error, which can happen if the function was just created
      if (error.message && error.message.includes('function not found')) {
        console.error('Function get_conversation_messages not found. It may need to be created in the database.')
      } else {
        console.error('Error getting conversation messages:', error)
      }
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error getting conversation messages:', error)
    return []
  }
}

/**
 * Creates a new conversation
 * @param {string} walletAddress - The user's wallet address
 * @param {string} title - The conversation title
 * @returns {Promise<number|null>} - The new conversation ID or null if creation failed
 */
export const createConversation = async (walletAddress, title) => {
  try {
    if (!walletAddress || !title) {
      console.error('Missing required parameters for createConversation')
      return null
    }

    // Call the create_conversation RPC function
    const { data, error } = await supabase.rpc('create_conversation', {
      p_wallet_address: walletAddress,
      p_title: title
    })

    if (error) {
      // Check if this is a "function not found" error, which can happen if the function was just created
      if (error.message && error.message.includes('function not found')) {
        console.error('Function create_conversation not found. It may need to be created in the database.')

        // Fallback: Create the conversation directly using the chat_conversations table
        try {
          // First get the user ID
          const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('wallet_address', walletAddress)
            .maybeSingle();

          if (user) {
            const { data: newConversation, error: insertError } = await supabase
              .from('chat_conversations')
              .insert({
                user_id: user.id,
                title: title,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select('id')
              .single();

            if (insertError) {
              console.error('Error creating conversation directly:', insertError)
              return null
            }

            return newConversation?.id || null
          }
        } catch (fallbackError) {
          console.error('Error in fallback conversation creation:', fallbackError)
        }
      } else {
        console.error('Error creating conversation:', error)
      }
      return null
    }

    return data
  } catch (error) {
    console.error('Error creating conversation:', error)
    return null
  }
}

/**
 * Updates a conversation title
 * @param {number} conversationId - The conversation ID
 * @param {string} title - The new title
 * @returns {Promise<boolean>} - Whether the update was successful
 */
export const updateConversationTitle = async (conversationId, title) => {
  try {
    if (!conversationId || !title) {
      console.error('Missing required parameters for updateConversationTitle')
      return false
    }

    // Call the update_conversation_title RPC function
    const { data, error } = await supabase.rpc('update_conversation_title', {
      p_conversation_id: conversationId,
      p_title: title
    })

    if (error) {
      // Check if this is a "function not found" error, which can happen if the function was just created
      if (error.message && error.message.includes('function not found')) {
        console.error('Function update_conversation_title not found. It may need to be created in the database.')

        // Fallback: Update the title directly in the chat_conversations table
        try {
          const { error: updateError } = await supabase
            .from('chat_conversations')
            .update({
              title: title,
              updated_at: new Date().toISOString()
            })
            .eq('id', conversationId);

          if (updateError) {
            console.error('Error updating conversation title directly:', updateError)
            return false
          }

          return true
        } catch (fallbackError) {
          console.error('Error in fallback title update:', fallbackError)
        }
      } else {
        console.error('Error updating conversation title:', error)
      }
      return false
    }

    return data
  } catch (error) {
    console.error('Error updating conversation title:', error)
    return false
  }
}

/**
 * Adds a message to a conversation
 * @param {number} conversationId - The conversation ID
 * @param {string} userId - The user ID
 * @param {string} message - The message content
 * @param {boolean} isUser - Whether the message is from the user (true) or AI (false)
 * @param {Object} metadata - Additional metadata for the message (optional)
 * @returns {Promise<number|null>} - The new message ID or null if addition failed
 */
export const addMessageToConversation = async (conversationId, userId, message, isUser, metadata = null) => {
  try {
    if (!conversationId || !userId || !message) {
      console.error('Missing required parameters for addMessageToConversation')
      return null
    }

    // Call the add_message_to_conversation RPC function
    const { data, error } = await supabase.rpc('add_message_to_conversation', {
      p_conversation_id: conversationId,
      p_user_id: userId,
      p_message: message,
      p_is_user: isUser,
      p_metadata: metadata
    })

    if (error) {
      // Check if this is a "function not found" error, which can happen if the function was just created
      if (error.message && error.message.includes('function not found')) {
        console.error('Function add_message_to_conversation not found. It may need to be created in the database.')

        // Fallback: Add the message directly to the chat_history table
        try {
          const { data: newMessage, error: insertError } = await supabase
            .from('chat_history')
            .insert({
              user_id: userId,
              conversation_id: conversationId,
              message: message,
              is_user: isUser,
              created_at: new Date().toISOString(),
              metadata: metadata
            })
            .select('id')
            .single();

          if (insertError) {
            console.error('Error adding message directly:', insertError)
            return null
          }

          // Update the conversation's updated_at timestamp
          await supabase
            .from('chat_conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', conversationId);

          return newMessage?.id || null
        } catch (fallbackError) {
          console.error('Error in fallback message addition:', fallbackError)
        }
      } else {
        console.error('Error adding message to conversation:', error)
      }
      return null
    }

    return data
  } catch (error) {
    console.error('Error adding message to conversation:', error)
    return null
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
    if (!walletAddress) {
      console.error('No wallet address provided for transaction sync');
      return false;
    }

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
      console.error('Missing required parameters for updateTransactionStatus:', {
        transactionId, transactionHash, status, walletAddress
      });
      return { error: 'Missing required parameters' };
    }

    // Ensure all parameters are strings
    const payload = {
      transactionId: String(transactionId),
      transactionHash: transactionHash ? String(transactionHash) : null,
      status: String(status),
      walletAddress: String(walletAddress)
    };

    const response = await fetch('/api/transactions/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { error: errorText };
      }
      console.error('Error response from transaction update API:', errorData);
      return { error: errorData.error || 'Failed to update transaction status' };
    }

    const data = await response.json();
    return { data };
  } catch (error) {
    console.error('Error updating transaction status:', error);
    return { error: error.message || 'Unknown error updating transaction status' };
  }
}

/**
 * Gets a user by wallet address
 * @param {string} walletAddress - The user's wallet address
 * @returns {Promise<Object>} - The user object
 */
export const getUserByWalletAddress = async (walletAddress) => {
  try {
    if (!walletAddress) {
      console.error('No wallet address provided to getUserByWalletAddress');
      return null;
    }

    // Normalize the wallet address to lowercase
    const normalizedAddress = walletAddress.toLowerCase();

    // Use maybeSingle instead of single to avoid 406 errors when no user is found
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', normalizedAddress)
      .maybeSingle();

    if (error) {
      console.error('Error getting user by wallet address:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error getting user by wallet address:', error);
    return null;
  }
}
