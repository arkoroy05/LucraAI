"use client"

import { useState, useEffect } from 'react'
import { useTransactions } from '../hooks/useTransactions'
import { formatAddressOrName } from '../utils/baseNameService'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { ArrowUpRight, Check, AlertCircle } from 'lucide-react'
import { useAccount, useChainId } from 'wagmi'
import { getNetworkByChainId, BASE_SEPOLIA } from '../config/networks'

/**
 * TransactionUI component that handles transaction execution and status display
 * for the chat interface
 */
export function TransactionUI({ parsedData = {}, transactionId }) {
  const [isExecuting, setIsExecuting] = useState(false)
  const [isUpdatingDb, setIsUpdatingDb] = useState(false)
  const [executionError, setExecutionError] = useState(null)
  const { address } = useAccount()
  const chainId = useChainId()

  // Get transaction functions and state
  const transactions = useTransactions()
  const {
    sendPayment,
    splitPayment,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    getExplorerUrl,
    network
  } = transactions

  // Determine if we're using the testnet
  const currentNetwork = getNetworkByChainId(chainId)
  const useTestnet = currentNetwork?.id === BASE_SEPOLIA.id

  // Update transaction status in Supabase when transaction status changes
  useEffect(() => {
    const updateTransactionStatus = async () => {
      if (!address || !hash || isUpdatingDb) return

      try {
        setIsUpdatingDb(true)

        // Determine the status
        let status = 'pending'
        if (isPending) status = 'sending'
        if (isConfirming) status = 'confirming'
        if (isConfirmed) status = 'completed'

        console.log(`Transaction status update: ${status} for hash ${hash}`)

        // Call the API to update the transaction status
        const response = await fetch('/api/transactions/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            transactionId, // If provided by the parent component
            transactionHash: hash,
            status,
            walletAddress: address
          })
        })

        if (!response.ok) {
          console.error('Failed to update transaction status in database')
        }
      } catch (error) {
        console.error('Error updating transaction status:', error)
      } finally {
        setIsUpdatingDb(false)
      }
    }

    if (hash && isExecuting) {
      updateTransactionStatus()

      // Set a polling interval to check transaction status
      const statusInterval = setInterval(updateTransactionStatus, 5000)

      // Clean up interval on unmount or when transaction is confirmed
      return () => {
        clearInterval(statusInterval)
      }
    }
  }, [hash, isPending, isConfirming, isConfirmed, address, isExecuting, transactionId, isUpdatingDb])

  // Automatically open Basescan when transaction is submitted
  useEffect(() => {
    if (hash && !window.basescanOpened) {
      const explorerUrl = getExplorerUrl()
      if (explorerUrl) {
        console.log(`Opening transaction in Basescan: ${explorerUrl}`)
        window.open(explorerUrl, '_blank')
        window.basescanOpened = true
      }
    }
  }, [hash, getExplorerUrl])

  // Execute the transaction based on the parsed data
  const executeTransaction = async () => {
    setIsExecuting(true)
    setExecutionError(null)

    try {
      // Prepare transaction data based on the intent/type
      let transactionData = null

      if (parsedData.intent === 'send' || parsedData.type === 'send') {
        // For send intent, use the first recipient
        const recipient = parsedData.recipients && parsedData.recipients.length > 0
          ? parsedData.recipients[0]
          : (parsedData.recipient || null)

        if (!recipient || !parsedData.amount) {
          throw new Error('Missing recipient or amount for send transaction')
        }

        // Check if the recipient is a Base Name or an address
        const isBaseName = !recipient.startsWith('0x') && (recipient.includes('.base') || recipient.includes('.eth'))

        // If it's a Base Name, use it directly, otherwise prepend 0x if needed
        const formattedRecipient = isBaseName ? recipient : (recipient.startsWith('0x') ? recipient : `0x${recipient}`)

        console.log(`Preparing transaction to ${formattedRecipient}`)

        transactionData = {
          type: 'send',
          recipient: formattedRecipient,
          amount: parsedData.amount,
          token: parsedData.token || 'ETH',
          note: parsedData.note || ''
        }
      } else if (parsedData.intent === 'split' || parsedData.type === 'split') {
        // For split intent, use all recipients
        if (!parsedData.recipients || parsedData.recipients.length === 0 || !parsedData.amount) {
          throw new Error('Missing recipients or amount for split transaction')
        }

        // Format recipients properly
        const formattedRecipients = parsedData.recipients.map(name => {
          const isBaseName = !name.startsWith('0x') && (name.includes('.base') || name.includes('.eth'))
          return isBaseName ? name : (name.startsWith('0x') ? name : `0x${name}`)
        })

        console.log(`Preparing split payment between ${formattedRecipients.join(', ')}`)

        transactionData = {
          type: 'split',
          recipients: formattedRecipients,
          amount: parsedData.amount,
          token: parsedData.token || 'ETH',
          note: parsedData.note || ''
        }
      } else if (parsedData.intent === 'check_balance' || parsedData.type === 'check_balance') {
        // For balance check, we don't need to execute a transaction
        console.log('Balance check requested, no transaction needed')
        setIsExecuting(false)
        return
      } else if (parsedData.intent === 'transaction_history' || parsedData.type === 'transaction_history') {
        // For transaction history, we don't need to execute a transaction
        console.log('Transaction history requested, no transaction needed')
        setIsExecuting(false)
        return
      }

      if (!transactionData) {
        throw new Error('Could not prepare transaction data')
      }

      // Call the execute-transaction API endpoint
      console.log('Calling execute-transaction API with data:', transactionData);
      const response = await fetch('/api/ai/execute-transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          transaction: transactionData,
          walletAddress: address,
          useTestnet
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to execute transaction');
      }

      const result = await response.json();
      console.log('Transaction execution result:', result);

      // If we're here, the transaction was successfully submitted
      // The actual blockchain confirmation will be handled by the useEffect above
      // that watches for hash, isPending, etc.

      // For now, we'll use the wagmi hooks for transaction status
      // but we could also implement a polling mechanism to check the status
      // of the transaction from the API if needed
    } catch (error) {
      console.error('Transaction execution error:', error);
      setExecutionError(error.message);
      setIsExecuting(false);
    }
  }

  // Get the transaction status
  const getTransactionStatus = () => {
    if (!isExecuting) return 'pending'
    if (isPending) return 'sending'
    if (isConfirming) return 'confirming'
    if (isConfirmed) return 'confirmed'
    if (hash && !isPending && !isConfirming && !isConfirmed) return 'processing' // Transaction submitted but not yet picked up by wagmi hooks
    return 'pending'
  }

  const status = getTransactionStatus()

  // Reset basescanOpened flag when component unmounts
  useEffect(() => {
    return () => {
      window.basescanOpened = false
    }
  }, [])

  return (
    <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10 transaction-ui">
      <div className="flex justify-between items-center mb-2">
        <span className="text-white/60">
          {parsedData.intent === "send" ? "Transaction" : "Split Payment"}
        </span>
        <motion.span
          animate={status === 'pending' ? { scale: [1, 1.05, 1] } : {}}
          transition={{ repeat: status === 'pending' ? Infinity : 0, duration: 2 }}
          className={`text-xs font-medium px-2 py-1 rounded-full ${
            status === 'confirmed'
              ? 'bg-green-500/20 text-green-400'
              : status === 'sending' || status === 'confirming' || status === 'processing'
                ? 'bg-yellow-500/20 text-yellow-400 animate-pulse'
                : 'bg-purple-400/10 text-purple-400'
          }`}
        >
          {status === 'confirmed' ? (
            <span className="flex items-center gap-1">
              <Check className="h-3 w-3" />
              Confirmed
            </span>
          ) : status === 'sending' ? (
            'Sending...'
          ) : status === 'confirming' ? (
            'Confirming...'
          ) : status === 'processing' ? (
            'Processing...'
          ) : (
            'Pending'
          )}
        </motion.span>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-white font-medium">
          {parsedData.amount || '0'} {parsedData.token || "ETH"} to{" "}
          {parsedData.recipients && parsedData.recipients.length > 0
            ? parsedData.recipients.map(r => `@${r}`).join(", ")
            : "recipient"}
          {parsedData.note ? ` ${parsedData.note}` : ""}
        </span>

        {!isExecuting ? (
          <motion.div whileHover={{ scale: 1.05 }}>
            <Button
              size="sm"
              onClick={executeTransaction}
              className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 gap-1"
            >
              Execute
              <ArrowUpRight className="h-3 w-3" />
            </Button>
          </motion.div>
        ) : hash ? (
          <motion.div whileHover={{ scale: 1.05 }}>
            <Button
              size="sm"
              variant="ghost"
              className="text-purple-400 hover:text-purple-300 gap-1"
              onClick={() => {
                // Get the explorer URL based on the network
                const explorerUrl = getExplorerUrl();
                window.open(explorerUrl, '_blank');
              }}
            >
              View
              <ArrowUpRight className="h-3 w-3" />
            </Button>
          </motion.div>
        ) : null}
      </div>

      {isExecuting && !hash && !isConfirmed && (
        <div className="mt-2 text-xs text-yellow-400 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Waiting for wallet confirmation...
        </div>
      )}

      {hash && (
        <div className="mt-2 text-xs text-white/60 truncate">
          TX: <a
            href={getExplorerUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300 hover:underline"
            onClick={(e) => {
              e.preventDefault()
              window.open(getExplorerUrl(), '_blank')
            }}
          >
            {hash}
          </a>
        </div>
      )}

      {isUpdatingDb && (
        <div className="mt-2 text-xs text-purple-400 flex items-center gap-1">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="h-3 w-3 border-2 border-purple-400 border-t-transparent rounded-full"
          />
          Syncing with database...
        </div>
      )}

      {executionError && (
        <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {executionError}
        </div>
      )}
    </div>
  )
}
