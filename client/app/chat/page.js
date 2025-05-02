"use client"

import { useState, useRef, useEffect } from "react"
import { Send, Mic, Wallet, ArrowUpRight, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Avatar } from "@/components/ui/avatar"
import { useChat } from "ai/react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { motion, AnimatePresence } from "framer-motion"

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
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat()
  const [isRecording, setIsRecording] = useState(false)
  const messagesEndRef = useRef(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const { width } = useWindowSize()
  const isMobile = width > 0 && width < 768

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const toggleRecording = () => {
    setIsRecording(!isRecording)
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
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
            <motion.div whileHover={{ scale: 1.05 }}>
              <Button className="bg-white/10 hover:bg-white/20 text-white text-sm">
                Connect Wallet
              </Button>
            </motion.div>
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
                  <motion.div whileHover={{ scale: 1.02 }}>
                    <Card className="p-4 bg-white/5 hover:bg-white/10 transition-colors border-white/10 cursor-pointer">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <motion.div
                            whileHover={{ rotate: 360 }}
                            transition={{ duration: 0.5 }}
                            className="p-2 rounded-lg bg-purple-500/20"
                          >
                            <Wallet className="h-4 w-4 text-purple-400" />
                          </motion.div>
                          <span className="text-sm font-medium text-white">Main Wallet</span>
                        </div>
                        <span className="text-sm font-medium text-purple-400">$1,234.56</span>
                      </div>
                    </Card>
                  </motion.div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">Quick Actions</h3>
                  <div className="space-y-1">
                    {['Send Crypto', 'Swap Tokens', 'View History', 'Settings'].map((action, index) => (
                      <motion.button
                        key={action}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.02, x: 5 }}
                        className="w-full p-3 text-left text-sm text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                      >
                        {action}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col md:ml-72 mt-16 relative z-10">
        {/* Chat container */}
        <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full p-6">
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
                        "rounded-2xl p-5 text-sm leading-relaxed",
                        message.role === "user"
                          ? "bg-purple-500/30 text-white backdrop-blur-sm"
                          : "bg-white/10 text-white/90 backdrop-blur-sm border border-white/10"
                      )}
                    >
                      {message.content}
                      {message.role === "assistant" && message.content.includes("transaction") && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10"
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
              <form onSubmit={handleSubmit} className="flex items-center gap-4 p-4">
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
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
