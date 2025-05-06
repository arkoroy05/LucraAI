"use client"

import { useState, useEffect } from 'react'
import { useTransactions } from '../hooks/useTransactions'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { ArrowUpRight, Check, AlertCircle } from 'lucide-react'
import { useAccount } from 'wagmi'

/**
 * TransactionUI component that handles transaction execution and status display
 * for the chat interface
 */
export function TransactionUI({ parsedData = {}, transactionId }) {
  const [isExecuting, setIsExecuting] = useState(false)
  const [isUpdatingDb, setIsUpdatingDb] = useState(false)
  const { address } = useAccount()
  const {
    sendPayment,
    splitPayment,
    hash,
    isPending,
    isConfirming,
    isConfirmed
  } = useTransactions()

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
    }
  }, [hash, isPending, isConfirming, isConfirmed, address, isExecuting, transactionId, isUpdatingDb])

  // Execute the transaction based on the parsed data
  const executeTransaction = () => {
    setIsExecuting(true)

    try {
      if (parsedData.intent === 'send') {
        // For send intent, use the first recipient
        const recipient = parsedData.recipients && parsedData.recipients.length > 0
          ? parsedData.recipients[0]
          : null

        if (recipient && parsedData.amount) {
          sendPayment(
            `0x${recipient}`, // This is a placeholder - in a real app, you'd resolve ENS names or use proper addresses
            parsedData.amount,
            parsedData.token || 'ETH'
          )
        }
      } else if (parsedData.intent === 'split') {
        // For split intent, use all recipients
        if (parsedData.recipients && parsedData.recipients.length > 0 && parsedData.amount) {
          // Convert recipient names to addresses (placeholder)
          const recipientAddresses = parsedData.recipients.map(name => `0x${name}`)

          splitPayment(
            recipientAddresses,
            parsedData.amount,
            parsedData.token || 'ETH'
          )
        }
      }
    } catch (error) {
      console.error('Transaction error:', error)
    }
  }

  // Get the transaction status
  const getTransactionStatus = () => {
    if (!isExecuting) return 'pending'
    if (isPending) return 'sending'
    if (isConfirming) return 'confirming'
    if (isConfirmed) return 'confirmed'
    return 'pending'
  }

  const status = getTransactionStatus()

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
              : status === 'sending' || status === 'confirming'
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
              onClick={() => window.open(`https://etherscan.io/tx/${hash}`, '_blank')}
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
          TX: {hash}
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
    </div>
  )
}
