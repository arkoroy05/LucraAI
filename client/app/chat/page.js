"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Mic, Wallet, ArrowUpRight, Menu, History, X, MessageSquare, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Avatar } from "@/components/ui/avatar"
import { useChat } from "ai/react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { motion, AnimatePresence } from "framer-motion"
import { ConnectWallet, AccountInfo, TransactionUI, SmartWalletUI, useWalletConnection } from "@/web3"
import { useAccount } from "wagmi"
import { storeWalletAddress, createConversation, addMessageToConversation, getConversationMessages, getUserByWalletAddress } from "@/utils/supabase"
import ChatHistory from "@/components/ChatHistory"
import TransactionHistory from "@/components/TransactionHistory"
import { useWalletBalance } from "@/web3/hooks/useWalletBalance"
import { formatTokenAmount } from "@/web3/utils/balanceUtils"
import { useAITransactions } from "@/hooks/useAITransactions"
import { useSearchParams } from "next/navigation"

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

const slideIn = {
  initial: { x: -300, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: -300, opacity: 0 },
  transition: { type: 'spring', stiffness: 300, damping: 30 }
}

function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
}

export default function ChatInterface() {
  const { address, isConnected } = useAccount()
  const { isConnected: isWalletConnected } = useWalletConnection()
  const [activeTab, setActiveTab] = useState('chat') // 'chat', 'history', 'transactions'
  const searchParams = useSearchParams()
  const conversationId = searchParams.get('conversation')
  const [currentConversationId, setCurrentConversationId] = useState(null)
  const [conversationTitle, setConversationTitle] = useState('')
  const [userId, setUserId] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const {
    nativeDisplayBalance,
    balances,
    refreshBalances,
    isLoading: isWalletBalanceLoading,
    isAgentLoading,
    isRefreshing
  } = useWalletBalance()

  // Combined loading state for balance
  const isBalanceLoading = isWalletBalanceLoading || isAgentLoading || isRefreshing;

  // Ref to track if we've already refreshed balances
  const hasRefreshedRef = useRef(false);

  // Store wallet address in Supabase when connected
  // Use a ref to track if we've already stored the wallet address
  const hasStoredWalletRef = useRef(false);

  useEffect(() => {
    if (isConnected && address && !hasStoredWalletRef.current) {
      // Mark as stored to prevent multiple calls
      hasStoredWalletRef.current = true;

      // Store wallet address in Supabase
      storeWalletAddress(address, 'wagmi')
        .then(() => console.log('Wallet address stored in Supabase'))
        .catch(err => console.error('Error storing wallet address:', err))

      // Get user ID for the wallet address
      getUserByWalletAddress(address)
        .then(user => {
          if (user) {
            setUserId(user.id)
          }
        })
        .catch(err => console.error('Error getting user ID:', err))

      // Refresh balances when wallet is connected, but only once
      if (!hasRefreshedRef.current) {
        hasRefreshedRef.current = true;
        console.log('Initial balance refresh on wallet connect');

        // Add a small delay to prevent race conditions
        setTimeout(() => {
          refreshBalances();
        }, 500);
      }
    }
  }, [isConnected, address, refreshBalances])

  // Load conversation if conversationId is provided
  useEffect(() => {
    if (conversationId && isConnected && address) {
      // Set the current conversation ID
      const numericConversationId = parseInt(conversationId, 10);
      if (!isNaN(numericConversationId)) {
        console.log('Setting current conversation ID:', numericConversationId);
        setCurrentConversationId(numericConversationId);
      } else {
        console.error('Invalid conversation ID:', conversationId);
      }

      // Load conversation messages
      getConversationMessages(numericConversationId)
        .then(messages => {
          if (messages && messages.length > 0) {
            // Set conversation title
            const firstMessage = messages[0]
            if (firstMessage && firstMessage.is_user) {
              // Use the first user message as the title (truncated)
              const title = firstMessage.message.length > 30
                ? firstMessage.message.substring(0, 30) + '...'
                : firstMessage.message
              setConversationTitle(title)
            }
          }
        })
        .catch(err => console.error('Error loading conversation messages:', err))
    }
  }, [conversationId, isConnected, address])

  // Load initial messages for conversation
  const [initialMessages, setInitialMessages] = useState([])

  // Load conversation messages if conversationId is provided
  useEffect(() => {
    if (currentConversationId && isConnected) {
      getConversationMessages(currentConversationId)
        .then(messages => {
          if (messages && messages.length > 0) {
            // Convert to the format expected by useChat
            const formattedMessages = messages.map(msg => {
              let parsedData = msg.metadata || undefined;
              // Normalize parsedData: if it exists but is missing intent, try to infer
              if (parsedData && !parsedData.intent) {
                // Try to infer intent from content or structure
                if (parsedData.type === 'send' || parsedData.type === 'split') {
                  parsedData.intent = parsedData.type;
                } else if (msg.content && msg.content.toLowerCase().includes('send')) {
                  parsedData.intent = 'send';
                } else if (msg.content && msg.content.toLowerCase().includes('split')) {
                  parsedData.intent = 'split';
                }
              }
              return {
                id: msg.id.toString(),
                role: msg.is_user ? 'user' : 'assistant',
                content: msg.message,
                createdAt: new Date(msg.created_at),
                metadata: msg.metadata,
                parsedData
              }
            })

            // Set initial messages
            setInitialMessages(formattedMessages)
          }
        })
        .catch(err => console.error('Error loading conversation messages:', err))
    } else {
      // Reset initial messages if no conversation ID
      setInitialMessages([])
    }
  }, [currentConversationId, isConnected])

  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput, setMessages } = useChat({
    api: '/api/chat',
    id: currentConversationId ? `conversation-${currentConversationId}` : 'lucra-chat',
    initialMessages: initialMessages,
    body: {
      clientInfo: {
        clientId: 'lucra-web-client',
        clientVersion: '1.0.0'
      },
      walletAddress: address || '',
      conversationId: currentConversationId
    },
    onResponse: (response) => {
      // This is called when the API response is received
      if (response.ok) {
        console.log('Chat response received');

        // Log all headers for debugging
        const headers = {};
        response.headers.forEach((value, key) => {
          headers[key] = value;
        });
        console.log('Response headers:', headers);

        // Get the parsed data from the custom header
        const parsedDataHeader = response.headers.get('X-Parsed-Data');
        if (parsedDataHeader) {
          try {
            const parsedData = JSON.parse(parsedDataHeader);
            console.log('Parsed data from header:', parsedData);

            // Check if this is a balance check request
            if (parsedData.intent === 'check_balance' || parsedData.action === 'check_balance' || parsedData.type === 'check_balance') {
              console.log('Balance check request detected in response header, refreshing balance');
              // Refresh the balance immediately
              refreshBalances().then(() => {
                console.log('Balance refreshed from response handler');
              }).catch(err => {
                console.error('Error refreshing balance:', err);
              });
            }

            // Store the parsed data to be used in the UI
            window.__lastParsedData = parsedData;
            
            // Attach parsedData to the last message immediately (don't wait for onFinish)
            // Find the last assistant message in the messages array
            setTimeout(() => {
              const lastMessageIndex = messages.length - 1;
              if (lastMessageIndex >= 0 && messages[lastMessageIndex].role === 'assistant') {
                console.log('Attaching parsed data to message index:', lastMessageIndex);
                setMessages(prevMessages => {
                  const updatedMessages = [...prevMessages];
                  updatedMessages[lastMessageIndex] = {
                    ...updatedMessages[lastMessageIndex],
                    parsedData
                  };
                  return updatedMessages;
                });
              }
            }, 500); // Small delay to ensure message is in the array
          } catch (err) {
            console.error('Error parsing X-Parsed-Data header:', err);
          }
        }
      } else {
        console.error('Error in chat response:', response.statusText);
      }
    },
    onFinish: (message) => {
      // This is called when the API response is complete
      console.log('Message finished:', message);

      // Check if this is a balance check request
      if (message.content && message.content.includes && message.content.includes('__FETCH_BALANCE__')) {
        console.log('Balance check message detected in onFinish, refreshing balance');

        // Extract wallet type if specified
        let walletType = 'both';
        const walletTypeMatch = message.content.match(/__FETCH_BALANCE__:(\w+)__/);
        if (walletTypeMatch && walletTypeMatch[1]) {
          walletType = walletTypeMatch[1];
        }

        console.log(`Balance check for wallet type: ${walletType}`);

        // Find the message element and update it to show loading state
        const messageEl = document.querySelector(`[data-message-id="${message.id}"]`);
        if (messageEl) {
          const messageContent = messageEl.querySelector('.message-content');
          if (messageContent) {
            messageContent.innerHTML = `<p>Fetching your ${walletType === 'smart' ? 'smart wallet' : walletType === 'main' ? 'main wallet' : 'wallet'} balance...</p>`;
          }
        }

        // Refresh the balance with the specified wallet type
        refreshBalances(true, walletType).then((result) => {
          console.log('Balance refreshed from onFinish handler, result:', result);

          // Determine which balance to display based on wallet type
          let displayBalance = nativeDisplayBalance || '0 ETH';

          // Get smart wallet balance if available and requested
          const smartWalletBalance = result?.balances?.agent?.balance || '0';

          // Generate appropriate balance text based on wallet type
          let balanceText = '';
          if (!isConnected) {
            balanceText = 'Please connect your wallet to check your balance.';
          } else if (walletType === 'smart') {
            balanceText = `Your smart wallet balance is ${parseFloat(smartWalletBalance).toFixed(2)} ETH.`;
          } else if (walletType === 'main') {
            balanceText = `Your main wallet balance is ${parseFloat(displayBalance).toFixed(2)}.`;
          } else {
            // Both wallets
            balanceText = `Your main wallet balance is ${parseFloat(displayBalance).toFixed(2)}. Your smart wallet balance is ${parseFloat(smartWalletBalance).toFixed(2)} ETH.`;
          }

          // Update the DOM element
          setTimeout(() => {
            const messageEl = document.querySelector(`[data-message-id="${message.id}"]`);
            if (messageEl) {
              const messageContent = messageEl.querySelector('.message-content');
              if (messageContent) {
                messageContent.innerHTML = `<p>${balanceText}</p>`;
              }
            }

            // Also update the message object in the messages array
            const messageIndex = messages.findIndex(m => m.id === message.id);
            if (messageIndex !== -1) {
              const updatedMessages = [...messages];
              updatedMessages[messageIndex] = {
                ...updatedMessages[messageIndex],
                content: balanceText
              };
              setMessages(updatedMessages);
            }
          }, 1000);
        }).catch(err => {
          console.error('Error refreshing balance:', err);

          // Show error message
          const messageEl = document.querySelector(`[data-message-id="${message.id}"]`);
          if (messageEl) {
            const messageContent = messageEl.querySelector('.message-content');
            if (messageContent) {
              messageContent.innerHTML = `<p>Error fetching balance: ${err.message || 'Unknown error'}</p>`;
            }
          }
        });
      }

      // Attach the parsed data from the header to the message
      if (window.__lastParsedData && message.role === 'assistant') {
        setMessages(prevMessages => prevMessages.map(m =>
          m.id === message.id ? { ...m, parsedData: window.__lastParsedData } : m
        ));
      }

      // Save AI response to conversation if we have a conversation ID
      if (currentConversationId && userId) {
        // Check if the message is a balance check placeholder
        const messageContent = message.content === '__FETCH_BALANCE__'
          ? `Your current balance is ${nativeDisplayBalance || '0 ETH'}.`
          : message.content;

        console.log('Saving message to conversation:', {
          conversationId: currentConversationId,
          userId,
          content: messageContent,
          metadata: window.__lastParsedData
        });

        addMessageToConversation(
          currentConversationId,
          userId,
          messageContent,
          false,
          window.__lastParsedData
        ).catch(error => {
          console.error('Error saving AI message to conversation:', error);
        });
      }
    },
    onError: (error) => {
      console.error('Chat error:', error);
    },
    // Use text protocol for compatibility with our API
    streamProtocol: 'text'
  })
  const [isRecording, setIsRecording] = useState(false)
  const messagesEndRef = useRef(null)
  const [suggestions, setSuggestions] = useState([])
  const { width } = useWindowSize()
  const isMobile = width > 0 && width < 768



  // Close sidebar on mobile when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobile && sidebarOpen && !event.target.closest('.sidebar')) {
        setSidebarOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isMobile, sidebarOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Render sidebar content
  const renderSidebarContent = () => {
    return (
      <motion.div
        className="sidebar fixed inset-y-0 left-0 w-72 bg-black/95 border-r border-white/10 p-4 z-50 overflow-y-auto"
        variants={slideIn}
        initial="initial"
        animate="animate"
        exit="exit"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Menu</h2>
            <Button
              variant="ghost"
              size="icon"
              className="text-white/60 hover:text-white"
              onClick={toggleSidebar}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="space-y-2 mb-6">
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-2 text-white/60 hover:text-white",
                activeTab === "chat" && "bg-white/10 text-white"
              )}
              onClick={() => setActiveTab("chat")}
            >
              <MessageSquare className="h-5 w-5" />
              Chat
            </Button>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-2 text-white/60 hover:text-white",
                activeTab === "history" && "bg-white/10 text-white"
              )}
              onClick={() => setActiveTab("history")}
            >
              <History className="h-5 w-5" />
              History
            </Button>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-2 text-white/60 hover:text-white",
                activeTab === "transactions" && "bg-white/10 text-white"
              )}
              onClick={() => setActiveTab("transactions")}
            >
              <Wallet className="h-5 w-5" />
              Transactions
            </Button>
          </nav>

          {/* Wallet Section */}
          <div className="mt-auto">
            <div className="p-4 bg-white/5 rounded-lg">
              <ConnectWallet />
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  // Generate suggestions based on input
  useEffect(() => {
    if (input.trim().length > 0) {
      // Simple pattern matching for suggestions
      const lowerInput = input.toLowerCase();
      const newSuggestions = [];

      if (lowerInput.includes('send') || lowerInput.includes('transfer')) {
        newSuggestions.push('Send 10 USDC');
      }

      if (lowerInput.includes('split')) {
        newSuggestions.push('Split equally');
      }

      if (lowerInput.includes('to') && !lowerInput.includes('@')) {
        newSuggestions.push('to @alice.base');
      }

      if (lowerInput.includes('check') || lowerInput.includes('balance')) {
        newSuggestions.push('Check balance');
      }

      if (lowerInput.includes('history') || lowerInput.includes('transactions')) {
        newSuggestions.push('Show history');
      }

      setSuggestions(newSuggestions);
    } else {
      setSuggestions([]);
    }
  }, [input]);

  const toggleRecording = () => {
    setIsRecording(!isRecording)
  }

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen)
  }

  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    let newInput = input;

    // Add the suggestion to the current input
    if (input.trim().length > 0) {
      newInput = `${input} ${suggestion}`;
    } else {
      newInput = suggestion;
    }

    // Update the input field
    handleInputChange({ target: { value: newInput } });
  }

  // Get AI transaction functions
  const {
    processMessage,
    isTransactionRequest,
    isProcessing: isAIProcessing,
    error: aiError
  } = useAITransactions();

  // Custom submit handler to ensure proper form submission
  const customSubmit = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    if (input.trim() === '') {
      return;
    }

    const userMessage = input.trim();

    // Create a new conversation if this is the first message and we're not in an existing conversation
    if (!currentConversationId && messages.length === 0 && isConnected && userId) {
      try {
        // Create a new conversation with the first message as the title
        const title = userMessage.length > 30
          ? userMessage.substring(0, 30) + '...'
          : userMessage;

        const newConversationId = await createConversation(address, title);

        if (newConversationId) {
          setCurrentConversationId(newConversationId);
          setConversationTitle(title);
          console.log('Created new conversation:', newConversationId);
        }
      } catch (error) {
        console.error('Error creating conversation:', error);
      }
    }

    // Check if this appears to be a transaction request
    if (isConnected && isTransactionRequest(userMessage)) {
      try {
        // Process the message with our AI transaction handler
        const result = await processMessage(userMessage);

        // If this was processed as a transaction, add it to the chat
        if (result.type === 'transaction') {
          // Add the user message to the chat
          const userMessageObj = {
            id: Date.now().toString(),
            role: 'user',
            content: userMessage,
          };

          // Add the AI response to the chat, with parsedData for TransactionUI
          const aiResponseObj = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: result.agentResponse.response || 'Transaction processed successfully.',
            parsedData: result.details // Attach parsedData for TransactionUI
          };

          // Clear the input
          setInput('');

          // Update the messages array
          setMessages((prev) => [...prev, userMessageObj, aiResponseObj]);

          // Save messages to conversation if we have a conversation ID
          if (currentConversationId && userId) {
            // Save user message
            await addMessageToConversation(
              currentConversationId,
              userId,
              userMessage,
              true
            );

            // Save AI response
            await addMessageToConversation(
              currentConversationId,
              userId,
              aiResponseObj.content,
              false,
              { transaction: result.details }
            );
          }

          return;
        }
      } catch (error) {
        console.error('Error processing transaction:', error);
        // Fall back to regular chat if transaction processing fails
      }
    }

    // Call the handleSubmit function from useChat for non-transaction messages
    const originalHandleSubmit = handleSubmit(e);

    // Save messages to conversation if we have a conversation ID
    if (currentConversationId && userId) {
      // We need to wait for the response to be received before saving the AI message
      // This is handled in the onFinish callback of useChat

      // Save user message immediately
      try {
        await addMessageToConversation(
          currentConversationId,
          userId,
          userMessage,
          true
        );
      } catch (error) {
        console.error('Error saving user message to conversation:', error);
      }
    }

    return originalHandleSubmit;
  }

  return (
    <div className="flex h-screen relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-[#0B0118]">
        {/* Dark overlay with gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />

        {/* Grid Pattern */}
        <div className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(139, 92, 246, 0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(139, 92, 246, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
            transform: 'perspective(1000px) rotateX(60deg)',
            transformOrigin: 'center center',
            opacity: 0.5
          }}
        />

        {/* Additional purple glow */}
        <div className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.15) 0%, transparent 70%)'
          }}
        />
      </div>

      {/* Top Navigation */}
      <div className="absolute top-0 left-0 right-0 h-16 bg-black/10 backdrop-blur-lg border-b border-white/10 z-50">
        <div className="flex items-center justify-between h-full px-6">
          <div className="flex items-center gap-6">
            <button
              onClick={toggleSidebar}
              className="md:hidden p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <Menu className="h-5 w-5 text-white" />
            </button>
            <span className="font-light tracking-tight text-white text-xl">
              lucra<span className="font-semibold">AI</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="text-white/60 hover:text-white text-sm">
              Member Perks
            </Button>
            <ConnectWallet />
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <AnimatePresence>
        {(!isMobile || sidebarOpen) && (
          <motion.div
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
              "fixed inset-y-0 left-0 w-72 transform z-50 mt-16",
              "bg-[#0F0118] backdrop-blur-xl border-r border-white/10"
            )}
          >
            <div className="p-6 h-full flex flex-col">
              <div className="space-y-8 flex-1 overflow-y-auto">
                {/* Wallet Section */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">Wallet</h3>
                  <AccountInfo />
                  {isWalletConnected && <SmartWalletUI />}
                </div>

                {/* Navigation */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">Navigation</h3>
                  <nav className="space-y-1">
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-2 text-white/80 hover:text-white hover:bg-white/5",
                        activeTab === "chat" && "bg-purple-500/10 text-purple-400"
                      )}
                      onClick={() => setActiveTab("chat")}
                    >
                      <MessageSquare className="h-4 w-4" />
                      Chat
                    </Button>

                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-2 text-white/80 hover:text-white hover:bg-white/5",
                        activeTab === "history" && "bg-purple-500/10 text-purple-400"
                      )}
                      onClick={() => setActiveTab("history")}
                    >
                      <History className="h-4 w-4" />
                      Chat History
                    </Button>

                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-2 text-white/80 hover:text-white hover:bg-white/5",
                        activeTab === "transactions" && "bg-purple-500/10 text-purple-400"
                      )}
                      onClick={() => setActiveTab("transactions")}
                    >
                      <Wallet className="h-4 w-4" />
                      Transaction History
                    </Button>

                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-2 text-white/80 hover:text-white hover:bg-white/5 mt-4"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Button>
                  </nav>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>



      <div className="flex-1 flex flex-col md:ml-72 mt-16 relative z-10">
        {/* Content container */}
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-6">
          {/* Tab content */}
          <AnimatePresence mode="wait">
            {activeTab === 'chat' && (
              <motion.div
                key="chat-tab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col"
              >
                {/* Welcome message */}
                <AnimatePresence>
                  {messages.length === 0 && (
                    <motion.div
                      variants={fadeIn}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      className="text-center transform mb-12"
                    >
                      <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-6xl md:text-7xl font-light tracking-tight text-white mb-6"
                      >
                        lucra<span className="font-semibold">AI</span>
                      </motion.h1>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-white/80 text-xl mb-12"
                      >
                        Your AI-powered crypto assistant
                      </motion.p>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="grid grid-cols-2 gap-4 max-w-2xl mx-auto"
                      >
                        {[
                          'Send 0.1 ETH to Alex',
                          'Check my balance',
                          'Swap 10 USDC to SOL',
                          'Show transaction history'
                        ].map((action, index) => (
                          <motion.div
                            key={action}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8 + index * 0.1 }}
                            whileHover={{ scale: 1.02 }}
                          >
                            <Button
                              variant="outline"
                              className="w-full py-6 text-sm bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-200"
                              onClick={() => {
                                // Set the input value to the action text
                                setInput(action);
                                // Submit the form with the action text
                                customSubmit({ preventDefault: () => {} });
                              }}
                            >
                              {action}
                            </Button>
                          </motion.div>
                        ))}
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Messages */}
                <div className="flex-1 space-y-6 chat-messages">
                    {messages.map((message) => {
                      console.log('Rendering message:', message);
                      return (
                        <div
                          key={message.id}
                          className={cn(
                            "flex",
                            message.role === "user" ? "justify-end" : "justify-start"
                          )}
                          data-message-id={message.id}
                          data-role={message.role}
                        >
                          <div
                            className={cn(
                              "flex items-start max-w-[80%] gap-4",
                              message.role === "user" ? "flex-row-reverse" : "flex-row"
                            )}
                          >
                            <Avatar
                              className={cn(
                                "h-10 w-10 border border-white/10 ring-2 ring-white/10",
                                message.role === "user" ? "bg-purple-500/80" : "bg-white/10"
                              )}
                            >
                              <div className="flex items-center justify-center h-full text-white text-sm font-medium">
                                {message.role === "user" ? "U" : "AI"}
                              </div>
                            </Avatar>

                            <div
                              className={cn(
                                "rounded-2xl p-5 text-sm leading-relaxed message-content",
                                message.role === "user"
                                  ? "bg-purple-500/30 text-white backdrop-blur-sm"
                                  : "bg-white/10 text-white/90 backdrop-blur-sm border border-white/10"
                              )}
                            >
                              {message.content && message.content.includes && message.content.includes("__FETCH_BALANCE__")
                                ? (isWalletBalanceLoading || isAgentLoading || isRefreshing
                                  ? "Fetching your wallet balance..."
                                  : message.content.match(/__FETCH_BALANCE__:(\w+)__/)
                                    ? (() => {
                                        const walletType = message.content.match(/__FETCH_BALANCE__:(\w+)__/)[1];
                                        if (!isConnected) return "Please connect your wallet to check your balance.";
                                        if (walletType === 'smart') return `Your smart wallet balance is ${balances?.agent?.balance || '0'} ETH.`;
                                        if (walletType === 'main') return `Your main wallet balance is ${nativeDisplayBalance}.`;
                                        return `Your main wallet balance is ${nativeDisplayBalance}. Your smart wallet balance is ${balances?.agent?.balance || '0'} ETH.`;
                                      })()
                                    : `Your current balance is ${nativeDisplayBalance || '0 ETH'}.`)
                                : message.content}

                              {message.role === "assistant" &&
                                message.parsedData && (
                                  (message.parsedData.intent && 
                                    (message.parsedData.intent === "send" || message.parsedData.intent === "split")) ||
                                  (message.parsedData.type && 
                                    (message.parsedData.type === "send" || message.parsedData.type === "split"))
                                ) && (
                                  <TransactionUI 
                                    parsedData={message.parsedData} 
                                    transactionId={message.id} 
                                  />
                                )
                              }
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
                <div ref={messagesEndRef} />

                {/* Input area */}
                <div className="sticky bottom-6 mt-6">
                  <Card className="backdrop-blur-xl bg-white/10 border-white/20 overflow-hidden">
                    <div className="flex flex-col gap-2">
                      {/* Suggestion chips */}
                      {suggestions.length > 0 && (
                        <div className="flex flex-wrap gap-2 px-4 pb-2">
                          {suggestions.map((suggestion, index) => (
                            <div key={suggestion}>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="bg-purple-500/20 border-purple-500/30 text-white hover:bg-purple-500/30 hover:border-purple-500/40"
                                onClick={() => handleSuggestionClick(suggestion)}
                              >
                                {suggestion}
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}

                      <form onSubmit={customSubmit} className="flex items-center gap-4 p-4">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "rounded-xl h-10 w-10 transition-all duration-300",
                            isRecording
                              ? "text-red-400 bg-red-500/20 hover:bg-red-500/30 ring-4 ring-red-500/20"
                              : "text-white/60 hover:text-white hover:bg-white/10"
                          )}
                          onClick={toggleRecording}
                        >
                          <Mic className="h-5 w-5" />
                        </Button>

                        <Input
                          value={input}
                          onChange={handleInputChange}
                          placeholder={isRecording ? "Listening..." : "Type a message or speak to send crypto..."}
                          disabled={isRecording}
                          className="bg-transparent border-0 focus-visible:ring-0 placeholder:text-white/40 text-white"
                          onKeyDown={(e) => {
                            // Submit on Enter key press (without Shift key)
                            if (e.key === 'Enter' && !e.shiftKey && input.trim() !== '') {
                              e.preventDefault();
                              customSubmit(e);
                            }
                          }}
                        />

                        <Button
                          type="submit"
                          variant="ghost"
                          size="icon"
                          className={cn(
                            "rounded-xl h-10 w-10 transition-all duration-300",
                            "text-white/60 hover:text-white hover:bg-white/10"
                          )}
                          disabled={isLoading || input.trim() === ""}
                          style={{ opacity: isLoading || input.trim() === "" ? 0.5 : 1 }}
                        >
                          <Send className="h-5 w-5" />
                        </Button>
                      </form>
                    </div>
                  </Card>
                </div>
              </motion.div>
            )}

            {activeTab === 'history' && (
              <motion.div
                key="history-tab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1"
              >
                <ChatHistory />
              </motion.div>
            )}

            {activeTab === 'transactions' && (
              <motion.div
                key="transactions-tab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1"
              >
                <TransactionHistory />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
