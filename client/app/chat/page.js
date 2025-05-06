"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Mic, Wallet, ArrowUpRight, Menu, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Avatar } from "@/components/ui/avatar"
import { useChat } from "ai/react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { motion, AnimatePresence } from "framer-motion"
import { ConnectWallet, AccountInfo, TransactionUI, useWalletConnection } from "@/web3"
import { useAccount } from "wagmi"
import { storeWalletAddress } from "@/utils/supabase"
import ChatHistory from "@/components/ChatHistory"
import TransactionHistory from "@/components/TransactionHistory"
import { useWalletBalance } from "@/web3/hooks/useWalletBalance"
import { formatTokenAmount } from "@/web3/utils/balanceUtils"

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

const slideIn = {
  initial: { x: -300 },
  animate: { x: 0 },
  exit: { x: -300 }
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
  const [activeTab, setActiveTab] = useState('chat') // 'chat', 'history', 'transactions'
  const {
    nativeDisplayBalance,
    balances,
    refreshBalances,
    isLoading: isBalanceLoading
  } = useWalletBalance()

  // Store wallet address in Supabase when connected
  useEffect(() => {
    if (isConnected && address) {
      storeWalletAddress(address, 'wagmi')
        .then(() => console.log('Wallet address stored in Supabase'))
        .catch(err => console.error('Error storing wallet address:', err))

      // Refresh balances when wallet is connected
      refreshBalances()
    }
  }, [isConnected, address, refreshBalances])

  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput } = useChat({
    api: '/api/chat',
    id: 'lucra-chat',
    initialMessages: [],
    body: {
      clientInfo: {
        clientId: 'lucra-web-client',
        clientVersion: '1.0.0'
      },
      walletAddress: address
    },
    onResponse: (response) => {
      // This is called when the API response is received
      if (response.ok) {
        console.log('Chat response received');

        // Get the parsed data from the custom header
        const parsedDataHeader = response.headers.get('X-Parsed-Data');
        if (parsedDataHeader) {
          try {
            const parsedData = JSON.parse(parsedDataHeader);
            console.log('Parsed data from header:', parsedData);

            // Store the parsed data to be used in the UI
            // We'll attach it to the last message when it's complete
            window.__lastParsedData = parsedData;
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

      // Attach the parsed data from the header to the message
      if (window.__lastParsedData) {
        // We need to use a different approach to modify the message object
        // since it might be read-only in strict mode
        setTimeout(() => {
          // Force a re-render with the updated messages
          // This is a hack, but it works for our purposes
          document.dispatchEvent(new CustomEvent('message-updated', {
            detail: { messageId: message.id, parsedData: window.__lastParsedData }
          }));

          console.log('Transaction data attached:', window.__lastParsedData);
        }, 0);

        // Clear the temporary storage
        window.__lastParsedData = null;
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const { width } = useWindowSize()
  const isMobile = width > 0 && width < 768

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Add event listener for message updates with parsed data
  useEffect(() => {
    const handleMessageUpdate = (event) => {
      const { messageId, parsedData } = event.detail;

      // Find the message in the DOM and update it
      // This is a workaround since we can't directly modify the messages array
      const messageElements = document.querySelectorAll(`[data-message-id="${messageId}"]`);
      if (messageElements.length > 0) {
        // Store the parsed data as a data attribute
        messageElements.forEach(el => {
          el.setAttribute('data-parsed-data', JSON.stringify(parsedData));

          // If this is an assistant message, check if we need to show transaction UI
          if (el.getAttribute('data-role') === 'assistant') {
            // Find or create the transaction UI container
            let transactionUI = el.querySelector('.transaction-ui');
            if (!transactionUI) {
              transactionUI = document.createElement('div');
              transactionUI.className = 'transaction-ui mt-4 p-4 bg-white/5 rounded-xl border border-white/10';
              el.querySelector('.message-content').appendChild(transactionUI);
            }

            // Update the transaction UI based on the parsed data
            if (parsedData.intent === 'send' || parsedData.intent === 'split') {
              transactionUI.innerHTML = `
                <div class="flex justify-between items-center mb-2">
                  <span class="text-white/60">
                    ${parsedData.intent === "send" ? "Transaction" : "Split Payment"}
                  </span>
                  <span class="text-purple-400 text-xs font-medium px-2 py-1 bg-purple-400/10 rounded-full">
                    Pending
                  </span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-white font-medium">
                    ${parsedData.amount} ${parsedData.token || "USDC"} to
                    ${parsedData.recipients && parsedData.recipients.length > 0
                      ? parsedData.recipients.map(r => `@${r}`).join(", ")
                      : "recipient"}
                    ${parsedData.note ? ` ${parsedData.note}` : ""}
                  </span>
                  <div>
                    <button class="text-purple-400 hover:text-purple-300 gap-1 text-sm px-2 py-1 bg-transparent">
                      View
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block">
                        <path d="M7 17L17 7"></path>
                        <path d="M7 7h10v10"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              `;
            }
          }
        });
      }
    };

    // Add the event listener
    document.addEventListener('message-updated', handleMessageUpdate);

    // Clean up
    return () => {
      document.removeEventListener('message-updated', handleMessageUpdate);
    };
  }, []);

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
    setIsSidebarOpen(!isSidebarOpen)
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

  // Custom submit handler to ensure proper form submission
  const customSubmit = (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    if (input.trim() === '') {
      return;
    }

    // Call the handleSubmit function from useChat
    handleSubmit(e);
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
      <motion.div
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", damping: 20 }}
        className="absolute top-0 left-0 right-0 h-16 bg-black/10 backdrop-blur-lg border-b border-white/10 z-50"
      >
        <div className="flex items-center justify-between h-full px-6">
          <div className="flex items-center gap-6">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleSidebar}
              className="md:hidden p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <Menu className="h-5 w-5 text-white" />
            </motion.button>
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="font-light tracking-tight text-white text-xl"
            >
              lucra<span className="font-semibold">AI</span>
            </motion.span>
          </div>
          <div className="flex items-center gap-4">
            <motion.div whileHover={{ scale: 1.05 }}>
              <Button variant="ghost" className="text-white/60 hover:text-white text-sm">
                Member Perks
              </Button>
            </motion.div>
            <ConnectWallet />
          </div>
        </div>
      </motion.div>

      {/* Sidebar */}
      <AnimatePresence>
        {(!isMobile || isSidebarOpen) && (
          <motion.div
            variants={slideIn}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ type: "spring", damping: 20 }}
            className={cn(
              "fixed inset-y-0 left-0 w-72 transform duration-300 ease-out z-40",
              "bg-black/20 backdrop-blur-xl border-r border-white/10",
              "md:translate-x-0 mt-16"
            )}
          >
            <div className="p-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-8"
              >
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">Wallet</h3>
                  <AccountInfo />
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">Navigation</h3>
                  <div className="space-y-1">
                    <motion.button
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                      whileHover={{ scale: 1.02, x: 5 }}
                      className={`w-full p-3 text-left text-sm ${activeTab === 'chat' ? 'text-purple-400 bg-purple-500/10' : 'text-white/80 hover:text-white hover:bg-white/5'} rounded-lg transition-colors`}
                      onClick={() => setActiveTab('chat')}
                    >
                      Chat
                    </motion.button>

                    <motion.button
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      whileHover={{ scale: 1.02, x: 5 }}
                      className={`w-full p-3 text-left text-sm ${activeTab === 'history' ? 'text-purple-400 bg-purple-500/10' : 'text-white/80 hover:text-white hover:bg-white/5'} rounded-lg transition-colors`}
                      onClick={() => setActiveTab('history')}
                    >
                      Chat History
                    </motion.button>

                    <motion.button
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      whileHover={{ scale: 1.02, x: 5 }}
                      className={`w-full p-3 text-left text-sm ${activeTab === 'transactions' ? 'text-purple-400 bg-purple-500/10' : 'text-white/80 hover:text-white hover:bg-white/5'} rounded-lg transition-colors`}
                      onClick={() => setActiveTab('transactions')}
                    >
                      Transaction History
                    </motion.button>

                    <motion.button
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 }}
                      whileHover={{ scale: 1.02, x: 5 }}
                      className="w-full p-3 text-left text-sm text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                      Settings
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
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
                <div className="flex-1 space-y-6">
                  <AnimatePresence>
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={cn(
                          "flex",
                          message.role === "user" ? "justify-end" : "justify-start"
                        )}
                        data-message-id={message.id}
                        data-role={message.role}
                      >
                        <motion.div
                          initial={{ scale: 0.8 }}
                          animate={{ scale: 1 }}
                          className={cn(
                            "flex items-start max-w-[80%] gap-4",
                            message.role === "user" ? "flex-row-reverse" : "flex-row"
                          )}
                        >
                          <motion.div whileHover={{ scale: 1.1 }}>
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
                          </motion.div>

                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: "spring", damping: 20 }}
                            className={cn(
                              "rounded-2xl p-5 text-sm leading-relaxed message-content",
                              message.role === "user"
                                ? "bg-purple-500/30 text-white backdrop-blur-sm"
                                : "bg-white/10 text-white/90 backdrop-blur-sm border border-white/10"
                            )}
                          >
                            {message.content === "__FETCH_BALANCE__" && isConnected
                              ? `Your current balance is ${nativeDisplayBalance}. Would you like to see a breakdown by token?`
                              : message.content === "__FETCH_BALANCE__" && !isConnected
                              ? "Please connect your wallet to check your balance."
                              : message.content}

                            {message.role === "assistant" && (
                              message.parsedData && (message.parsedData.intent === "send" || message.parsedData.intent === "split") ? (
                                <TransactionUI parsedData={message.parsedData} />
                              ) : (
                                message.content.includes("transaction") && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10 transaction-ui"
                                  >
                                    <div className="flex justify-between items-center mb-2">
                                      <span className="text-white/60">Transaction</span>
                                      <motion.span
                                        animate={{ scale: [1, 1.05, 1] }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                        className="text-purple-400 text-xs font-medium px-2 py-1 bg-purple-400/10 rounded-full"
                                      >
                                        Pending
                                      </motion.span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-white font-medium">0.1 ETH to Alex</span>
                                      <motion.div whileHover={{ scale: 1.05 }}>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="text-purple-400 hover:text-purple-300 gap-1"
                                        >
                                          View
                                          <ArrowUpRight className="h-3 w-3" />
                                        </Button>
                                      </motion.div>
                                    </div>
                                  </motion.div>
                                )
                              )
                            )}
                          </motion.div>
                        </motion.div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
                <div ref={messagesEndRef} />

                {/* Input area */}
                <motion.div
                  initial={{ y: 100 }}
                  animate={{ y: 0 }}
                  transition={{ type: "spring", damping: 20 }}
                  className="sticky bottom-6 mt-6"
                >
                  <Card className="backdrop-blur-xl bg-white/10 border-white/20 overflow-hidden">
                    <div className="flex flex-col gap-2">
                      {/* Suggestion chips */}
                      {suggestions.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex flex-wrap gap-2 px-4 pb-2"
                        >
                          {suggestions.map((suggestion, index) => (
                            <motion.div
                              key={suggestion}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: index * 0.1 }}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                            >
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="bg-purple-500/20 border-purple-500/30 text-white hover:bg-purple-500/30 hover:border-purple-500/40"
                                onClick={() => handleSuggestionClick(suggestion)}
                              >
                                {suggestion}
                              </Button>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}

                      <form onSubmit={customSubmit} className="flex items-center gap-4 p-4">
                        <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
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
                        </motion.div>

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

                        <motion.div
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          style={{ opacity: isLoading || input.trim() === "" ? 0.5 : 1 }}
                        >
                          <Button
                            type="submit"
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "rounded-xl h-10 w-10 transition-all duration-300",
                              "text-white/60 hover:text-white hover:bg-white/10"
                            )}
                            disabled={isLoading || input.trim() === ""}
                          >
                            <Send className="h-5 w-5" />
                          </Button>
                        </motion.div>
                      </form>
                    </div>
                  </Card>
                </motion.div>
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
