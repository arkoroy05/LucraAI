"use client"

import { useSendTransaction, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther } from 'viem'

/**
 * Custom hook for handling cryptocurrency transactions
 * Provides methods to send transactions and track their status
 */
export function useTransactions() {
  const { data: hash, isPending, sendTransaction } = useSendTransaction()
  
  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed,
    data: receipt
  } = useWaitForTransactionReceipt({ hash })

  /**
   * Send a transaction to a recipient
   * @param {string} to - Recipient address
   * @param {string} amount - Amount in ETH
   * @param {string} token - Token symbol (currently only supports native ETH)
   */
  const sendPayment = (to, amount, token = 'ETH') => {
    // Currently only supporting ETH, but could be extended for other tokens
    if (token === 'ETH') {
      sendTransaction({
        to,
        value: parseEther(amount.toString()),
      })
    } else {
      // For other tokens, we would need to implement ERC20 token transfers
      console.log(`Token ${token} not supported yet`)
    }
  }

  /**
   * Split a payment between multiple recipients
   * @param {Array} recipients - Array of recipient addresses
   * @param {string} amount - Total amount to split
   * @param {string} token - Token symbol (currently only supports native ETH)
   */
  const splitPayment = (recipients, amount, token = 'ETH') => {
    // Calculate amount per recipient
    const amountPerRecipient = (parseFloat(amount) / recipients.length).toString()
    
    // For now, we'll just send individual transactions
    // In a production app, this could be optimized with a smart contract
    recipients.forEach(recipient => {
      sendPayment(recipient, amountPerRecipient, token)
    })
  }

  return {
    sendPayment,
    splitPayment,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    receipt
  }
}
