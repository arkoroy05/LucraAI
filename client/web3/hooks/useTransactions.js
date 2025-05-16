"use client"

import { useSendTransaction, useWaitForTransactionReceipt, useAccount, useChainId } from 'wagmi'
import { parseEther } from 'viem'
import { useCallback, useEffect, useState } from 'react'
import {
  prepareTransaction,
  formatTransaction,
  storeTransaction,
  resolveBaseName,
  getNetworkByChainId,
  BASE_MAINNET,
  BASE_SEPOLIA
} from '..'

/**
 * Custom hook for handling cryptocurrency transactions
 * Provides methods to send transactions and track their status
 */
export function useTransactions() {
  const { data: hash, isPending, sendTransaction, error: sendError } = useSendTransaction()
  const { address } = useAccount()
  const chainId = useChainId()
  const [lastTransaction, setLastTransaction] = useState(null)
  const [transactionError, setTransactionError] = useState(null)

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    data: receipt
  } = useWaitForTransactionReceipt({ hash })

  // Get the current network based on the chain ID
  const network = getNetworkByChainId(chainId) || BASE_MAINNET

  // Store transaction in Supabase when confirmed
  useEffect(() => {
    const storeConfirmedTransaction = async () => {
      if (hash && isConfirmed && receipt && lastTransaction) {
        try {
          // Format the transaction for storage
          const formattedTx = formatTransaction({
            hash,
            to: lastTransaction.to,
            value: receipt.value || lastTransaction.value,
            network
          })

          // Store the transaction in Supabase
          await storeTransaction({
            hash,
            to: lastTransaction.to,
            value: formattedTx.value,
            token: lastTransaction.token || 'ETH',
            walletAddress: address,
            type: 'send',
            status: 'confirmed',
            note: lastTransaction.note || ''
          })
        } catch (error) {
          console.error('Error storing confirmed transaction:', error)
        }
      }
    }

    storeConfirmedTransaction()
  }, [hash, isConfirmed, receipt, address, lastTransaction, network])

  // Reset error when a new transaction is sent
  useEffect(() => {
    if (hash) {
      setTransactionError(null)
    }
  }, [hash])

  // Track send errors
  useEffect(() => {
    if (sendError) {
      setTransactionError(sendError.message)
    }
  }, [sendError])

  /**
   * Send a transaction to a recipient
   * @param {Object} params - Transaction parameters
   * @param {string} params.to - Recipient address or Base Name
   * @param {string|number} params.amount - Amount in ETH
   * @param {string} params.token - Token symbol (currently only supports native ETH)
   * @param {string} params.note - Optional note for the transaction
   * @returns {Promise<Object>} - Result object with success flag and hash or error
   */
  const sendPayment = useCallback(async (params) => {
    try {
      setTransactionError(null)
      
      // Handle both object and individual parameters
      const to = params.to || params;
      const amount = params.amount || arguments[1];
      const token = params.token || arguments[2] || 'ETH';
      const note = params.note || arguments[3] || '';
      
      if (!to) {
        throw new Error('Recipient address is required')
      }
      
      if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        throw new Error('Valid amount is required')
      }

      console.log(`Sending payment: ${amount} ${token} to ${to}`);

      // Prepare the transaction
      const preparedTx = await prepareTransaction({
        to,
        amount,
        token,
        network: network.id === BASE_SEPOLIA.id ? 'base-sepolia' : 'base-mainnet'
      })

      // Save the transaction details for later use
      setLastTransaction({
        to: preparedTx.to,
        value: preparedTx.value,
        token,
        note
      })

      // Currently only supporting ETH, but could be extended for other tokens
      if (token === 'ETH') {
        const result = await sendTransaction({
          to: preparedTx.to,
          value: preparedTx.value,
        })
        
        return {
          success: true,
          hash: result?.hash,
          to: preparedTx.to
        }
      } else {
        // For other tokens, we would need to implement ERC20 token transfers
        const error = `Token ${token} not supported yet`;
        console.log(error);
        setTransactionError(error);
        return {
          success: false,
          error
        }
      }
    } catch (error) {
      console.error('Error sending payment:', error)
      setTransactionError(error.message)
      return {
        success: false,
        error: error.message
      }
    }
  }, [sendTransaction, network.id])

  /**
   * Split a payment between multiple recipients
   * @param {Array} recipients - Array of recipient addresses or Base Names
   * @param {string} amount - Total amount to split
   * @param {string} token - Token symbol (currently only supports native ETH)
   * @param {string} note - Optional note for the transaction
   */
  const splitPayment = useCallback(async (recipients, amount, token = 'ETH', note = '') => {
    try {
      // Resolve all recipient addresses
      const resolvedRecipients = await Promise.all(
        recipients.map(async (recipient) => {
          const resolved = await resolveBaseName(recipient)
          return resolved || recipient
        })
      )

      // Calculate amount per recipient
      const amountPerRecipient = (parseFloat(amount) / resolvedRecipients.length).toString()

      // For now, we'll just send individual transactions
      // In a production app, this could be optimized with a smart contract
      const results = [];
      for (const recipient of resolvedRecipients) {
        const result = await sendPayment({
          to: recipient, 
          amount: amountPerRecipient, 
          token, 
          note
        });
        results.push(result);
      }
      
      return {
        success: results.every(r => r.success),
        results
      }
    } catch (error) {
      console.error('Error splitting payment:', error)
      setTransactionError(error.message)
      return {
        success: false,
        error: error.message
      }
    }
  }, [sendPayment])

  /**
   * Get the explorer URL for the current transaction
   * @returns {string|null} - Explorer URL or null if no transaction hash
   */
  const getExplorerUrl = useCallback(() => {
    if (!hash) return null

    const baseUrl = network.id === BASE_SEPOLIA.id
      ? 'https://sepolia.basescan.org/tx/'
      : 'https://basescan.org/tx/'

    return `${baseUrl}${hash}`
  }, [hash, network.id])

  return {
    sendPayment,
    splitPayment,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    receipt,
    getExplorerUrl,
    network,
    error: transactionError
  }
}
