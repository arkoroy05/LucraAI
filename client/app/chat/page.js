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
  const { isConnected: isWalletConnected } = useWalletConnection()
  const [activeTab, setActiveTab] = useState('chat') // 'chat', 'history', 'transactions'
  const searchParams = useSearchParams()
  const conversationId = searchParams.get('conversation')
  const [currentConversationId, setCurrentConversationId] = useState(null)
  const [conversationTitle, setConversationTitle] = useState('')
  const [userId, setUserId] = useState(null)
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
            const formattedMessages = messages.map(msg => ({
              id: msg.id.toString(),
              role: msg.is_user ? 'user' : 'assistant',
              content: msg.message,
              createdAt: new Date(msg.created_at),
              metadata: msg.metadata
            }))

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

      // Check if this is a balance check request
      if (message.content === '__FETCH_BALANCE__' || (message.content && message.content.includes && message.content.includes('__FETCH_BALANCE__'))) {
        console.log('Balance check message detected in onFinish, refreshing balance');

        // Find the message element and update it to show loading state
        const messageEl = document.querySelector(`[data-message-id="${message.id}"]`);
        if (messageEl) {
          const messageContent = messageEl.querySelector('.message-content');
          if (messageContent) {
            messageContent.innerHTML = `<p>Fetching your balance...</p>`;
          }
        }

        // Refresh the balance
        refreshBalances().then(() => {
          console.log('Balance refreshed from onFinish handler, updating UI with balance:', nativeDisplayBalance);

          // Find the message element and update it with the actual balance
          setTimeout(() => {
            const balanceText = isConnected
              ? `Your current balance is ${nativeDisplayBalance || '0 ETH'}. Would you like to see a breakdown by token?`
              : 'Please connect your wallet to check your balance.';

            // Update the DOM element
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
        }, 0);

        // Clear the temporary storage
        window.__lastParsedData = null;
      } else if (currentConversationId && userId) {
        // Check if the message is a balance check placeholder
        const messageContent = message.content === '__FETCH_BALANCE__'
          ? `Your current balance is ${nativeDisplayBalance || '0 ETH'}.`
          : message.content;

        console.log('Saving message to conversation (no parsed data):', {
          conversationId: currentConversationId,
          userId,
          content: messageContent
        });

        // Save AI response to conversation without parsed data
        addMessageToConversation(
          currentConversationId,
          userId,
          messageContent,
          false,
          message.content === '__FETCH_BALANCE__' ? { intent: 'check_balance', token: 'ETH' } : null
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
            // Check if this is a balance check request
            if (parsedData && (parsedData.intent === 'check_balance' || parsedData.action === 'check_balance' || parsedData.type === 'check_balance')) {
              console.log('Balance check request detected in message update, refreshing balance');

              // Update the message content if it's the balance placeholder
              const messageContent = el.querySelector('.message-content');
              if (messageContent && (
                  messageContent.textContent.includes('__FETCH_BALANCE__') ||
                  messageContent.innerHTML.includes('__FETCH_BALANCE__')
                )) {
                // First show loading state
                messageContent.innerHTML = `<p>Fetching your balance...</p>`;

                // Refresh the balance
                refreshBalances().then(() => {
                  console.log('Balance refreshed from message update handler, balance:', nativeDisplayBalance);

                  // Then update with the actual balance after a short delay
                  setTimeout(() => {
                    const balanceText = isConnected
                      ? `Your current balance is ${nativeDisplayBalance || '0 ETH'}. Would you like to see a breakdown by token?`
                      : 'Please connect your wallet to check your balance.';
                    messageContent.innerHTML = `<p>${balanceText}</p>`;

                    // Also update the message object if possible
                    const messageIndex = messages.findIndex(m => m.id === messageId);
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
                  messageContent.innerHTML = `<p>Error fetching balance: ${err.message || 'Unknown error'}</p>`;
                });
              }

              return; // Skip the rest of the processing for balance checks
            }

            // Find or create the transaction UI container
            let transactionUI = el.querySelector('.transaction-ui');
            if (!transactionUI) {
              transactionUI = document.createElement('div');
              transactionUI.className = 'transaction-ui mt-4 p-4 bg-white/5 rounded-xl border border-white/10';
              el.querySelector('.message-content').appendChild(transactionUI);
            }

            // Update the transaction UI based on the parsed data
            if (parsedData && (parsedData.intent === 'send' || parsedData.intent === 'split')) {
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
  }, [isConnected, nativeDisplayBalance, refreshBalances, messages, setMessages]);

  // Add event listener for AI transactions
  useEffect(() => {
    const handleAITransaction = (event) => {
      const { userMessage, aiResponse, transactionDetails } = event.detail;

      // Add the messages to the DOM
      const chatContainer = document.querySelector('.chat-messages');
      if (chatContainer) {
        // Create user message element
        const userMessageEl = document.createElement('div');
        userMessageEl.className = 'message user-message mb-6';
        userMessageEl.setAttribute('data-message-id', userMessage.id);
        userMessageEl.setAttribute('data-role', 'user');
        userMessageEl.innerHTML = `
          <div class="flex items-start gap-4">
            <div class="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <div class="flex-1">
              <div class="message-content prose prose-invert">
                <p>${userMessage.content}</p>
              </div>
            </div>
          </div>
        `;
        chatContainer.appendChild(userMessageEl);

        // Create AI response element
        const aiMessageEl = document.createElement('div');
        aiMessageEl.className = 'message ai-message mb-6';
        aiMessageEl.setAttribute('data-message-id', aiResponse.id);
        aiMessageEl.setAttribute('data-role', 'assistant');
        aiMessageEl.innerHTML = `
          <div class="flex items-start gap-4">
            <div class="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 8V4H8"></path>
                <rect width="16" height="12" x="4" y="8" rx="2"></rect>
                <path d="M2 14h2"></path>
                <path d="M20 14h2"></path>
                <path d="M15 13v2"></path>
                <path d="M9 13v2"></path>
              </svg>
            </div>
            <div class="flex-1">
              <div class="message-content prose prose-invert">
                <p>${aiResponse.content}</p>
              </div>
              <div class="transaction-ui mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <div class="flex justify-between items-center mb-2">
                  <span class="text-white/60">
                    ${transactionDetails.type === "send" ? "Transaction" : "Split Payment"}
                  </span>
                  <span class="text-purple-400 text-xs font-medium px-2 py-1 bg-purple-400/10 rounded-full">
                    Processing
                  </span>
                </div>
                <div class="flex justify-between items-center">
                  <span class="text-white font-medium">
                    ${transactionDetails.amount} ${transactionDetails.token || "ETH"} to
                    ${transactionDetails.type === "split"
                      ? transactionDetails.recipients.map(r => `@${r}`).join(", ")
                      : `@${transactionDetails.recipient}`}
                  </span>
                  <div>
                    <button class="text-purple-400 hover:text-purple-300 gap-1 text-sm px-2 py-1 bg-transparent">
                      Execute
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="inline-block">
                        <path d="M7 17L17 7"></path>
                        <path d="M7 7h10v10"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;
        chatContainer.appendChild(aiMessageEl);

        // Scroll to the bottom
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    };

    // Add the event listener
    document.addEventListener('ai-transaction', handleAITransaction);

    // Clean up
    return () => {
      document.removeEventListener('ai-transaction', handleAITransaction);
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

          // Add the AI response to the chat
          const aiResponseObj = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: result.agentResponse.response || 'Transaction processed successfully.',
          };

          // Clear the input
          setInput('');

          // Update the messages array
          // Since we can't directly modify the messages array from useChat,
          // we'll add a custom event to handle this
          document.dispatchEvent(new CustomEvent('ai-transaction', {
            detail: {
              userMessage: userMessageObj,
              aiResponse: aiResponseObj,
              transactionDetails: result.details
            }
          }));

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
      {(!isMobile || isSidebarOpen) && (
        <div
          className={cn(
            "fixed inset-y-0 left-0 w-72 transform duration-300 ease-out z-40",
            "bg-black/20 backdrop-blur-xl border-r border-white/10",
            "md:translate-x-0 mt-16"
          )}
        >
          <div className="p-6">
            <div className="space-y-8">
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">Wallet</h3>
                <AccountInfo />
                {isWalletConnected && <SmartWalletUI />}
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium text-white/60 uppercase tracking-wider">Navigation</h3>
                <div className="space-y-1">
                  <button
                    className={`w-full p-3 text-left text-sm ${activeTab === 'chat' ? 'text-purple-400 bg-purple-500/10' : 'text-white/80 hover:text-white hover:bg-white/5'} rounded-lg transition-colors`}
                    onClick={() => setActiveTab('chat')}
                  >
                    Chat
                  </button>

                  <button
                    className={`w-full p-3 text-left text-sm ${activeTab === 'history' ? 'text-purple-400 bg-purple-500/10' : 'text-white/80 hover:text-white hover:bg-white/5'} rounded-lg transition-colors`}
                    onClick={() => setActiveTab('history')}
                  >
                    Chat History
                  </button>

                  <button
                    className={`w-full p-3 text-left text-sm ${activeTab === 'transactions' ? 'text-purple-400 bg-purple-500/10' : 'text-white/80 hover:text-white hover:bg-white/5'} rounded-lg transition-colors`}
                    onClick={() => setActiveTab('transactions')}
                  >
                    Transaction History
                  </button>

                  <button
                    className="w-full p-3 text-left text-sm text-white/80 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                  >
                    Settings
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
                <div className="flex-1 space-y-6 chat-messages">
                    {messages.map((message) => (
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
                            {message.content === "__FETCH_BALANCE__" && isConnected
                              ? (isBalanceLoading
                                ? "Fetching your balance..."
                                : `Your current balance is ${nativeDisplayBalance || '0 ETH'}. Would you like to see a breakdown by token?`)
                              : message.content === "__FETCH_BALANCE__" && !isConnected
                              ? "Please connect your wallet to check your balance."
                              : message.content.includes && message.content.includes("__FETCH_BALANCE__")
                              ? (isBalanceLoading
                                ? "Fetching your balance..."
                                : `Your current balance is ${nativeDisplayBalance || '0 ETH'}. Would you like to see a breakdown by token?`)
                              : message.content}

                            {message.role === "assistant" && (
                              message.parsedData && message.parsedData.intent &&
                              (message.parsedData.intent === "send" || message.parsedData.intent === "split") ? (
                                <TransactionUI parsedData={message.parsedData} transactionId={message.id} />
                              ) : (
                                message.content && message.content.includes && message.content.includes("transaction") && (
                                  <div
                                    className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10 transaction-ui"
                                  >
                                    <div className="flex justify-between items-center mb-2">
                                      <span className="text-white/60">Transaction</span>
                                      <span
                                        className="text-purple-400 text-xs font-medium px-2 py-1 bg-purple-400/10 rounded-full"
                                      >
                                        Pending
                                      </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-white font-medium">ETH to recipient</span>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="text-purple-400 hover:text-purple-300 gap-1"
                                      >
                                        View
                                        <ArrowUpRight className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                )
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
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
