"use client"

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useRouter } from 'next/navigation'
import { getChatConversations, getConversationMessages, getChatHistory, updateConversationTitle } from '@/utils/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDistanceToNow } from 'date-fns'
import { Loader2, User, Bot, MessageSquare, ArrowLeft, Edit2, Check, X, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function ChatHistory() {
  const { address, isConnected } = useAccount()
  const router = useRouter()
  const [conversations, setConversations] = useState([])
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [conversationMessages, setConversationMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editingTitle, setEditingTitle] = useState(null)
  const [newTitle, setNewTitle] = useState('')
  const [viewMode, setViewMode] = useState('conversations') // 'conversations' or 'messages'

  // Fetch conversations
  useEffect(() => {
    const fetchConversations = async () => {
      if (!isConnected || !address) {
        setConversations([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        const data = await getChatConversations(address)

        // If no conversations exist yet, fetch regular chat history
        if (!data || data.length === 0) {
          const chatHistory = await getChatHistory(address)
          setConversations([])

          // We'll show the old chat history format if no conversations exist
          if (chatHistory && chatHistory.length > 0) {
            setSelectedConversation({
              id: 'legacy',
              title: 'Previous Conversations',
              legacy: true
            })
            setConversationMessages(chatHistory)
            setViewMode('messages')
          }
        } else {
          setConversations(data)
        }

        setError(null)
      } catch (err) {
        console.error('Error fetching chat conversations:', err)
        setError('Failed to load chat conversations')
      } finally {
        setLoading(false)
      }
    }

    fetchConversations()
  }, [address, isConnected])

  // Fetch messages for selected conversation
  useEffect(() => {
    const fetchConversationMessages = async () => {
      if (!selectedConversation || selectedConversation.legacy) return

      try {
        setLoading(true)
        const data = await getConversationMessages(selectedConversation.id)
        setConversationMessages(data || [])
      } catch (err) {
        console.error('Error fetching conversation messages:', err)
        setError('Failed to load conversation messages')
      } finally {
        setLoading(false)
      }
    }

    if (selectedConversation) {
      fetchConversationMessages()
    }
  }, [selectedConversation])

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation)
    setViewMode('messages')
  }

  const handleBackToConversations = () => {
    setSelectedConversation(null)
    setConversationMessages([])
    setViewMode('conversations')
  }

  const handleEditTitle = (conversation) => {
    setEditingTitle(conversation.id)
    setNewTitle(conversation.title)
  }

  const handleSaveTitle = async (conversationId) => {
    if (!newTitle.trim()) {
      // Don't save empty titles
      handleCancelEdit();
      return;
    }

    try {
      // Call the API to update the title
      const success = await updateConversationTitle(conversationId, newTitle);

      if (success) {
        // Update the UI
        setConversations(conversations.map(conv =>
          conv.id === conversationId ? { ...conv, title: newTitle } : conv
        ));

        if (selectedConversation && selectedConversation.id === conversationId) {
          setSelectedConversation({ ...selectedConversation, title: newTitle });
        }
      } else {
        console.error('Failed to update conversation title');
      }
    } catch (error) {
      console.error('Error updating conversation title:', error);
    }

    setEditingTitle(null);
  }

  const handleCancelEdit = () => {
    setEditingTitle(null)
    setNewTitle('')
  }

  const handleContinueConversation = (conversation) => {
    // Navigate to chat page with conversation ID
    router.push(`/chat?conversation=${conversation.id}`)
  }

  const handleNewChat = () => {
    // Navigate to chat page with no conversation ID
    router.push('/chat')
  }

  if (!isConnected) {
    return (
      <div className="p-4 text-center text-white/60">
        Connect your wallet to view chat history
      </div>
    )
  }

  if (loading && conversations.length === 0 && !selectedConversation) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
      </div>
    )
  }

  if (error && !selectedConversation) {
    return (
      <div className="p-4 text-center text-red-400">
        {error}
      </div>
    )
  }

  // Render conversation list
  const renderConversationList = () => {
    if (conversations.length === 0) {
      return (
        <div className="p-4 text-center text-white/60">
          <p className="mb-4">No saved conversations found</p>
          <Button
            onClick={handleNewChat}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Start a new chat
          </Button>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Your Conversations</h2>
          <Button
            onClick={handleNewChat}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>

        <div className="grid gap-4">
          {conversations.map((conversation) => (
            <motion.div
              key={conversation.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <div className="flex justify-between items-start mb-2">
                {editingTitle === conversation.id ? (
                  <div className="flex items-center gap-2 w-full">
                    <Input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="bg-black/30 border-white/20 text-white"
                      autoFocus
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleSaveTitle(conversation.id)}
                      className="text-green-400 hover:text-green-300 hover:bg-green-900/20"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={handleCancelEdit}
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div
                      className="text-white font-medium flex-1"
                      onClick={() => handleSelectConversation(conversation)}
                    >
                      {conversation.title}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEditTitle(conversation)}
                      className="text-white/60 hover:text-white hover:bg-white/10"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>

              <div
                className="text-white/60 text-sm mb-3 line-clamp-2"
                onClick={() => handleSelectConversation(conversation)}
              >
                {conversation.last_message || "No messages"}
              </div>

              <div className="flex justify-between items-center">
                <div className="text-xs text-white/40">
                  {formatDistanceToNow(new Date(conversation.updated_at), { addSuffix: true })}
                  <span className="mx-2">•</span>
                  {conversation.message_count} {conversation.message_count === 1 ? 'message' : 'messages'}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleContinueConversation(conversation)}
                  className="text-xs bg-purple-500/20 border-purple-500/30 text-purple-200 hover:bg-purple-500/30 hover:text-white"
                >
                  Continue
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  // Render conversation messages
  const renderConversationMessages = () => {
    if (!selectedConversation) return null

    if (conversationMessages.length === 0) {
      return (
        <div className="p-4 text-center text-white/60">
          No messages in this conversation
        </div>
      )
    }

    // Group messages by date
    const groupedMessages = conversationMessages.reduce((groups, message) => {
      const date = new Date(message.created_at).toLocaleDateString()
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(message)
      return groups
    }, {})

    return (
      <div className="space-y-4">
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

  return (
    <div className="space-y-4 p-2">
      <AnimatePresence mode="wait">
        {viewMode === 'conversations' ? (
          <motion.div
            key="conversations"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {renderConversationList()}
          </motion.div>
        ) : (
          <motion.div
            key="messages"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center mb-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBackToConversations}
                className="mr-2 text-white/60 hover:text-white hover:bg-white/10"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h2 className="text-xl font-semibold text-white">{selectedConversation?.title}</h2>

              {selectedConversation && !selectedConversation.legacy && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleContinueConversation(selectedConversation)}
                  className="ml-auto text-purple-400 hover:text-purple-300 hover:bg-purple-900/20"
                >
                  Continue this conversation
                </Button>
              )}
            </div>

            {renderConversationMessages()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
