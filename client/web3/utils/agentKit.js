/**
 * AgentKit integration for LucraAI
 * This provides functionality for processing natural language transaction requests
 */

import { formatEther, parseEther, createPublicClient, http } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import { resolveBaseName } from './baseNameResolver';
import { BASE_MAINNET, BASE_SEPOLIA } from '../config/networks';

// Create public clients for Base Mainnet and Sepolia
const baseClient = createPublicClient({
  chain: base,
  transport: http(BASE_MAINNET.rpcUrls.default),
});

const baseSepoliaClient = createPublicClient({
  chain: baseSepolia,
  transport: http(BASE_SEPOLIA.rpcUrls.default),
});

/**
 * AgentKit class for handling transaction requests
 */
class AgentKit {
  constructor(config) {
    this.name = config.name || 'LucraAI Agent';
    this.description = config.description || 'LucraAI transaction agent';
    this.instructions = config.instructions || '';
    this.capabilities = config.capabilities || {};
  }

  /**
   * Process a natural language message
   * @param {string} message - User's natural language message
   * @returns {Promise<object>} - Processed transaction details or message response
   */
  async process(message) {
    try {
      // Check if the message is a transaction request
      if (!isTransactionRequest(message)) {
        return {
          type: 'message',
          agentResponse: {
            response: 'I couldn\'t identify a transaction request in your message. Please try again with a clearer request, such as "Send 0.1 ETH to alice.base".',
          },
        };
      }

      // Extract transaction details from the message
      const details = await extractTransactionDetails(message);

      if (details) {
        // Format a response based on the transaction type
        let response;
        if (details.type === 'send') {
          const recipient = Array.isArray(details.recipients) ? details.recipients[0] : details.recipient;
          response = `I'll process your request to send ${details.amount} ${details.token} to ${recipient}.`;
        } else if (details.type === 'split') {
          response = `I'll process your request to split ${details.amount} ${details.token} between ${details.recipients.join(', ')}.`;
        } else {
          response = `I'll process your ${details.type} request for ${details.amount} ${details.token}.`;
        }

        return {
          type: 'transaction',
          details,
          agentResponse: { response },
        };
      }

      // Fallback response if we couldn't extract details
      return {
        type: 'message',
        agentResponse: {
          response: 'I understood you want to make a transaction, but I couldn\'t extract all the necessary details. Please provide more information, such as the amount and recipient.',
        },
      };
    } catch (error) {
      console.error('Error processing message:', error);
      return {
        type: 'error',
        error: error.message,
        agentResponse: {
          response: 'I encountered an error while processing your request. Please try again with a clearer message.',
        },
      };
    }
  }
}

/**
 * Creates a transaction agent with the specified configuration
 * @param {object} options - Options for creating the agent
 * @param {boolean} options.useTestnet - Whether to use the Sepolia testnet
 * @param {string} options.walletAddress - User's wallet address
 * @param {string} options.smartWalletAddress - Optional smart wallet address
 * @returns {AgentKit} - Configured AgentKit instance
 */
export function createTransactionAgent({ useTestnet = false, walletAddress, smartWalletAddress }) {
  const client = useTestnet ? baseSepoliaClient : baseClient;
  const chain = useTestnet ? baseSepolia : base;

  // Use smart wallet address if provided, otherwise use the connected wallet address
  const targetAddress = smartWalletAddress || walletAddress;

  if (!targetAddress) {
    console.error('No wallet address provided to createTransactionAgent');
  } else {
    console.log(`Creating agent for address: ${targetAddress} (${smartWalletAddress ? 'smart wallet' : 'connected wallet'})`);
  }

  const agent = new AgentKit({
    name: 'LucraAI Transaction Agent',
    description: 'An agent that helps with cryptocurrency transactions on Base',
    instructions: `
      You are LucraAI's transaction agent. You help users send, receive, and track cryptocurrency transactions on the Base network.
      You can handle the following tasks:
      - Send ETH to an address or Base Name
      - Split payments between multiple recipients
      - Check transaction status
      - Provide transaction history
      - Resolve Base Names to addresses

      Always verify transaction details before executing them.
    `,
    capabilities: {
      sendTransaction: {
        enabled: true,
        handler: async ({ to, amount, token = 'ETH' }) => {
          try {
            // Resolve the recipient address if it's a Base Name
            const resolvedTo = await resolveBaseName(to, useTestnet);

            if (!resolvedTo) {
              throw new Error(`Could not resolve recipient address: ${to}`);
            }

            // Parse the amount to wei
            const value = parseEther(amount.toString());

            // Return the transaction details
            return {
              to: resolvedTo,
              value,
              token,
              chain: chain.name,
              walletAddress: targetAddress, // Use the target address
            };
          } catch (error) {
            console.error('Error in sendTransaction handler:', error);
            throw error;
          }
        },
      },
      resolveBaseName: {
        enabled: true,
        handler: async ({ name }) => {
          try {
            const address = await resolveBaseName(name, useTestnet);
            return {
              name,
              address,
              resolved: !!address,
            };
          } catch (error) {
            console.error('Error in resolveBaseName handler:', error);
            throw error;
          }
        },
      },
      getBalance: {
        enabled: true,
        handler: async () => {
          try {
            if (!targetAddress) {
              throw new Error('Wallet address is required to fetch balance');
            }

            console.log(`Fetching balance for address: ${targetAddress} on ${chain.name}`);

            try {
              // Fetch the balance from the blockchain with a timeout
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

              // Fetch the balance from the blockchain
              const balance = await client.getBalance({
                address: targetAddress,
              });

              // Clear the timeout
              clearTimeout(timeoutId);

              // Format the balance for display
              const formattedBalance = formatEther(balance);

              console.log(`Fetched balance: ${formattedBalance} ETH for address ${targetAddress}`);

              return {
                balance: formattedBalance,
                token: 'ETH',
                chain: chain.name,
              };
            } catch (initialError) {
              console.error('Initial balance fetch failed:', initialError);

              // Try up to 3 times with increasing delays between retries
              for (let retry = 1; retry <= 3; retry++) {
                try {
                  console.log(`Retry attempt ${retry} for getBalance...`);

                  // Add an increasing delay before retrying
                  await new Promise(resolve => setTimeout(resolve, retry * 500));

                  // Try fetch again
                  const balance = await client.getBalance({
                    address: targetAddress,
                  });

                  // Format the balance for display
                  const formattedBalance = formatEther(balance);

                  console.log(`Successfully retrieved balance on retry ${retry}: ${formattedBalance} ETH for address ${targetAddress}`);

                  return {
                    balance: formattedBalance,
                    token: 'ETH',
                    chain: chain.name,
                  };
                } catch (retryError) {
                  console.error(`Error on retry ${retry}:`, retryError);

                  // If this is the last retry and it failed, continue to fallback
                  if (retry === 3) {
                    console.warn('All retry attempts failed, returning default balance');
                  }
                }
              }
            }

            // If all retries fail, return a default balance of 0
            console.warn(`Returning default balance of 0 ETH for ${targetAddress} after all attempts failed`);
            return {
              balance: '0',
              token: 'ETH',
              chain: chain.name,
              error: 'Failed to fetch balance after multiple attempts'
            };
          } catch (error) {
            console.error('Error in getBalance handler:', error);

            // Return a default balance of 0 with error information
            return {
              balance: '0',
              token: 'ETH',
              chain: chain.name,
              error: error.message || 'Unknown error fetching balance'
            };
          }
        },
      },
      getTransactionHistory: {
        enabled: true,
        handler: async ({ limit = 10 }) => {
          try {
            if (!targetAddress) {
              throw new Error('Wallet address is required to fetch transaction history');
            }

            // In a real implementation, we would query an API or blockchain for the transaction history
            // For now, we'll check the database

            try {
              // Fetch transaction history from the API
              const response = await fetch(`/api/transactions/history?walletAddress=${targetAddress}&limit=${limit}`, {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json'
                }
              });

              if (!response.ok) {
                throw new Error(`Failed to fetch transaction history: ${response.statusText}`);
              }

              const history = await response.json();

              return {
                transactions: history.transactions || [],
                count: history.count || 0,
                token: 'ETH',
                chain: chain.name,
              };
            } catch (apiError) {
              console.error('Error fetching transaction history from API:', apiError);
              throw apiError;
            }
          } catch (error) {
            console.error('Error in getTransactionHistory handler:', error);
            throw error;
          }
        }
      }
    },
  });

  return agent;
}

/**
 * Processes a natural language transaction request
 * @param {object} options - Options for processing the request
 * @param {string} options.message - User's natural language message
 * @param {boolean} options.useTestnet - Whether to use the Sepolia testnet
 * @param {string} options.walletAddress - User's wallet address
 * @returns {Promise<object>} - Processed transaction details
 */
export async function processTransactionRequest({ message, useTestnet = false, walletAddress }) {
  try {
    // Create an agent for handling the transaction
    const agent = createTransactionAgent({ useTestnet, walletAddress });

    // Process the message
    return await agent.process(message);
  } catch (error) {
    console.error('Error processing transaction request:', error);

    // Return a fallback response
    return {
      type: 'error',
      error: error.message || 'An error occurred while processing your transaction request',
      agentResponse: {
        response: 'I encountered an error while processing your request. Please try again later.',
      },
    };
  }
}

/**
 * Checks if a message appears to be a transaction request
 * @param {string} message - User's natural language message
 * @returns {boolean} - True if the message appears to be a transaction request
 */
export function isTransactionRequest(message) {
  if (!message || typeof message !== 'string') return false;

  const lowerMessage = message.toLowerCase();

  // Check for transaction-related keywords
  const sendKeywords = ['send', 'transfer', 'pay', 'payment'];
  const splitKeywords = ['split', 'divide', 'share'];
  const checkKeywords = ['check', 'balance', 'show balance', 'how much'];
  const historyKeywords = ['history', 'transaction', 'transactions', 'recent'];
  const tokenKeywords = ['eth', 'ether', 'usdc', 'dai', 'crypto', 'token', 'coin'];

  // Check if the message contains transaction-related keywords
  const hasSendKeyword = sendKeywords.some(keyword => lowerMessage.includes(keyword));
  const hasSplitKeyword = splitKeywords.some(keyword => lowerMessage.includes(keyword));
  const hasCheckKeyword = checkKeywords.some(keyword => lowerMessage.includes(keyword));
  const hasHistoryKeyword = historyKeywords.some(keyword => lowerMessage.includes(keyword));
  const hasTokenKeyword = tokenKeywords.some(keyword => lowerMessage.includes(keyword));

  // Special case for balance check
  if (lowerMessage.includes('balance') ||
      (lowerMessage.includes('check') && !lowerMessage.includes('check out')) ||
      lowerMessage.includes('how much') ||
      lowerMessage.includes('show balance')) {
    console.log('Transaction request detected: Balance check');
    return true;
  }

  // Return true if the message contains at least one transaction-related keyword
  return hasSendKeyword || hasSplitKeyword || hasCheckKeyword || hasHistoryKeyword ||
         (hasTokenKeyword && (hasSendKeyword || hasSplitKeyword || hasCheckKeyword || hasHistoryKeyword));
}

/**
 * Extracts transaction details from a natural language message
 * @param {string} message - User's natural language message
 * @returns {Promise<object|null>} - Extracted transaction details or null if extraction failed
 */
export async function extractTransactionDetails(message) {
  if (!message || typeof message !== 'string') return null;

  const lowerMessage = message.toLowerCase();

  // Check for transaction type
  let type = 'unknown';
  let amount = null;
  let token = 'ETH';  // Always default to ETH
  let recipient = null;
  let recipients = [];
  let splitType = null;

  // Check for check balance intent
  if (lowerMessage.includes('balance') ||
      lowerMessage.includes('check') ||
      lowerMessage.includes('how much') ||
      lowerMessage.includes('show balance')) {
      console.log('Detected balance check request');
      return {
        type: 'check_balance',
        intent: 'check_balance',
        action: 'check_balance',
        amount: null,
        token: 'ETH',  // Always use ETH
        recipients: []
      };
    }

  // Check for transaction history intent
  if (lowerMessage.includes('history') ||
      lowerMessage.includes('transactions') ||
      lowerMessage.includes('recent') &&
      lowerMessage.includes('transaction')) {
      return {
        type: 'transaction_history',
        limit: 10,
        token: 'ETH'  // Always use ETH
      };
    }

  // Extract transaction type
  if (lowerMessage.includes('send') || lowerMessage.includes('pay') || lowerMessage.includes('transfer')) {
    type = 'send';
  } else if (lowerMessage.includes('split') || lowerMessage.includes('divide') || lowerMessage.includes('share')) {
    type = 'split';

    // Extract split type
    if (lowerMessage.includes('equal') || lowerMessage.includes('equally') || lowerMessage.includes('even') || lowerMessage.includes('evenly')) {
      splitType = 'equal';
    } else if (lowerMessage.includes('percent') || lowerMessage.includes('%')) {
      splitType = 'percentage';
    } else {
      splitType = 'custom';
    }
  }

  // Extract amount
  const amountMatch = message.match(/\b(\d+(\.\d+)?)\s*(eth|ether|usdc|dai|usd)?\b/i);
  if (amountMatch) {
    amount = parseFloat(amountMatch[1]);

    // Extract token if specified, but ALWAYS default to ETH regardless of what's specified
    token = 'ETH';
  }

  // Extract recipients (anything with @ symbol)
  const recipientMatches = message.match(/@(\w+(\.\w+)?)/g);
  if (recipientMatches) {
    recipients = recipientMatches.map(r => r.substring(1));
    if (recipients.length === 1) {
      recipient = recipients[0];
    }
  }

  // If we have a valid type and amount, return the transaction details
  if (type !== 'unknown' && amount !== null) {
      return {
        type,
        amount,
        token,  // Always ETH
        recipient,
        recipients,
        splitType
      };
    }

    return null;
}