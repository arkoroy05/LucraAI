"use client"

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { getTransactionHistory } from '@/utils/supabase'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { ArrowUpRight, ArrowDownLeft, Loader2 } from 'lucide-react'

export default function TransactionHistory() {
  const { address, isConnected } = useAccount()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchTransactions = async () => {
      if (!isConnected || !address) {
        setTransactions([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const data = await getTransactionHistory(address)
        setTransactions(data)
        setError(null)
      } catch (err) {
        console.error('Error fetching transaction history:', err)
        setError('Failed to load transaction history')
      } finally {
        setLoading(false)
      }
    }

    fetchTransactions()
  }, [address, isConnected])

  if (!isConnected) {
    return (
      <div className="p-4 text-center text-white/60">
        Connect your wallet to view transaction history
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-400">
        {error}
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="p-4 text-center text-white/60">
        No transactions found
      </div>
    )
  }

  return (
    <div className="space-y-4 p-2">
      <h2 className="text-xl font-semibold text-white mb-4">Transaction History</h2>
      
      <div className="space-y-3">
        {transactions.map((tx) => (
          <motion.div
            key={tx.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 rounded-lg p-4 border border-white/10"
          >
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                {tx.transaction_type === 'send' ? (
                  <div className="bg-purple-500/20 p-2 rounded-full mr-3">
                    <ArrowUpRight className="h-5 w-5 text-purple-500" />
                  </div>
                ) : (
                  <div className="bg-green-500/20 p-2 rounded-full mr-3">
                    <ArrowDownLeft className="h-5 w-5 text-green-500" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-white">
                    {tx.transaction_type === 'send' ? 'Sent' : 'Received'} {tx.amount} {tx.token}
                  </p>
                  <p className="text-sm text-white/60">
                    {tx.recipient_address.slice(0, 6)}...{tx.recipient_address.slice(-4)}
                  </p>
                  {tx.note && <p className="text-sm text-white/80 mt-1">Note: {tx.note}</p>}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-white/60">
                  {tx.created_at ? formatDistanceToNow(new Date(tx.created_at), { addSuffix: true }) : 'Unknown date'}
                </p>
                <p className={`text-sm ${tx.status === 'completed' ? 'text-green-400' : 'text-yellow-400'}`}>
                  {tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
                </p>
              </div>
            </div>
            
            {tx.transaction_hash && (
              <div className="mt-2 pt-2 border-t border-white/10">
                <a 
                  href={`https://basescan.org/tx/${tx.transaction_hash}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-purple-400 hover:text-purple-300 flex items-center"
                >
                  View on Basescan
                  <ArrowUpRight className="h-3 w-3 ml-1" />
                </a>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  )
}
