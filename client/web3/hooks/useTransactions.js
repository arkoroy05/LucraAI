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
  const { data: hash, isPending, sendTransaction } = useSendTransaction()
  const { address } = useAccount()
  const chainId = useChainId()
  const [lastTransaction, setLastTransaction] = useState(null)

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

  /**
   * Send a transaction to a recipient
   * @param {string} to - Recipient address or Base Name
   * @param {string} amount - Amount in ETH
   * @param {string} token - Token symbol (currently only supports native ETH)
   * @param {string} note - Optional note for the transaction
   */
  const sendPayment = useCallback(async (to, amount, token = 'ETH', note = '') => {
    try {
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
        sendTransaction({
          to: preparedTx.to,
          value: preparedTx.value,
        })
      } else {
        // For other tokens, we would need to implement ERC20 token transfers
        console.log(`Token ${token} not supported yet`)
      }
    } catch (error) {
      console.error('Error sending payment:', error)
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
      resolvedRecipients.forEach(recipient => {
        sendPayment(recipient, amountPerRecipient, token, note)
      })
    } catch (error) {
      console.error('Error splitting payment:', error)
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
    network
  }
}
