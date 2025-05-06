"use client"

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { getChatHistory } from '@/utils/supabase'
import { motion } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { Loader2, User, Bot } from 'lucide-react'

export default function ChatHistory() {
  const { address, isConnected } = useAccount()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchChatHistory = async () => {
      if (!isConnected || !address) {
        setMessages([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const data = await getChatHistory(address)
        setMessages(data)
        setError(null)
      } catch (err) {
        console.error('Error fetching chat history:', err)
        setError('Failed to load chat history')
      } finally {
        setLoading(false)
      }
    }

    fetchChatHistory()
  }, [address, isConnected])

  if (!isConnected) {
    return (
      <div className="p-4 text-center text-white/60">
        Connect your wallet to view chat history
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

  if (messages.length === 0) {
    return (
      <div className="p-4 text-center text-white/60">
        No chat history found
      </div>
    )
  }

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.created_at).toLocaleDateString()
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(message)
    return groups
  }, {})

  return (
    <div className="space-y-4 p-2">
      <h2 className="text-xl font-semibold text-white mb-4">Chat History</h2>
      
      {Object.entries(groupedMessages).map(([date, dateMessages]) => (
        <div key={date} className="space-y-3">
          <div className="text-center">
            <span className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded-full">
              {date}
            </span>
          </div>
          
          {dateMessages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-lg p-4 flex ${
                message.is_user 
                  ? 'bg-purple-500/20 ml-8' 
                  : 'bg-white/5 mr-8 border border-white/10'
              }`}
            >
              <div className={`flex-shrink-0 mr-3 ${message.is_user ? 'order-last ml-3 mr-0' : ''}`}>
                {message.is_user ? (
                  <div className="bg-purple-500/30 p-2 rounded-full">
                    <User className="h-5 w-5 text-purple-200" />
                  </div>
                ) : (
                  <div className="bg-white/10 p-2 rounded-full">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                )}
              </div>
              
              <div className={`flex-1 ${message.is_user ? 'text-right' : ''}`}>
                <p className="text-white whitespace-pre-wrap">{message.message}</p>
                <p className="text-xs text-white/40 mt-1">
                  {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                </p>
                
                {message.metadata && message.metadata.transaction && (
                  <div className="mt-2 pt-2 border-t border-white/10">
                    <p className="text-xs text-white/60">
                      Transaction: {message.metadata.transaction.type} {message.metadata.transaction.amount} {message.metadata.transaction.token}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      ))}
    </div>
  )
}
