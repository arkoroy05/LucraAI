/**
 * AgentKit Integration for LucraAI
 * This file provides functions to integrate AgentKit with the existing chat implementation
 */

import { createTransactionAgent, extractTransactionDetails } from './agentKit';

/**
 * Process a message using AgentKit
 * @param {Object} options - Options for processing the message
 * @param {string} options.message - The message to process
 * @param {string} options.walletAddress - The wallet address to use
 * @param {boolean} options.useTestnet - Whether to use testnet
 * @returns {Promise<Object>} - The processed message
 */
export async function processMessageWithAgentKit({ message, walletAddress, useTestnet = false }) {
  try {
    // First, try to extract transaction details directly
    const extractedDetails = await extractTransactionDetails(message);

    // If we could extract transaction details, process them
    if (extractedDetails) {
      // Create an agent for handling the transaction
      const agent = createTransactionAgent({ useTestnet, walletAddress });

      // Initialize the agent
      try {
        await agent.initialize();
        console.log('Successfully initialized agent for message processing');
      } catch (initError) {
        console.error('Failed to initialize agent for message processing:', initError);
        // Continue with the implementation
      }

      // Format a response based on the transaction type
      let response;
      if (extractedDetails.type === 'send') {
        const recipient = Array.isArray(extractedDetails.recipients) ? extractedDetails.recipients[0] : extractedDetails.recipient;
        response = `🤖 I've prepared a transaction to send ${extractedDetails.amount} ${extractedDetails.token} to ${recipient}.`;
      } else if (extractedDetails.type === 'split') {
        response = `🤖 I've prepared a request to split ${extractedDetails.amount} ${extractedDetails.token} between ${extractedDetails.recipients.join(', ')}.`;
      } else if (extractedDetails.type === 'check_balance') {
        // Use the agent's getBalance capability
        try {
          const balanceResult = await agent.capabilities.getBalance.handler();
          response = `🤖 Your current balance is ${balanceResult.balance} ${balanceResult.token} on ${balanceResult.chain}.`;
        } catch (balanceError) {
          console.error('Error fetching balance:', balanceError);
          response = '🤖 I encountered an error while fetching your balance. Please try again later.';
        }
      } else if (extractedDetails.type === 'transaction_history') {
        // Use the agent's getTransactionHistory capability
        try {
          const historyResult = await agent.capabilities.getTransactionHistory.handler({
            limit: extractedDetails.limit || 10
          });

          if (historyResult.transactions && historyResult.transactions.length > 0) {
            response = `🤖 You have ${historyResult.transactions.length} recent transactions. Here are the details:`;
            historyResult.transactions.forEach((tx, index) => {
              response += `\n${index + 1}. ${tx.transaction_type} ${tx.amount} ${tx.token} to ${tx.recipient_address.substring(0, 8)}... (${tx.status})`;
            });
          } else {
            response = '🤖 You don\'t have any transaction history yet.';
          }
        } catch (historyError) {
          console.error('Error fetching transaction history:', historyError);
          response = '🤖 I encountered an error while fetching your transaction history. Please try again later.';
        }
      } else {
        response = `🤖 I've prepared your ${extractedDetails.type} request for ${extractedDetails.amount} ${extractedDetails.token}.`;
      }

      // Convert the extracted details to the format expected by the chat component
      const parsedData = {
        intent: extractedDetails.type,
        amount: extractedDetails.amount,
        token: extractedDetails.token || 'ETH',
        recipients: extractedDetails.recipients || [],
        split_type: extractedDetails.splitType,
        note: extractedDetails.note,
        isConversational: false,
        raw_message: message,
        parsed_by: 'agentKit'
      };

      return {
        response,
        parsedData,
        isTransaction: true,
        transactionDetails: extractedDetails
      };
    }

    // If we couldn't extract transaction details, return null
    return null;
  } catch (error) {
    console.error('Error processing message with AgentKit:', error);
    return null;
  }
}

/**
 * Modify the parsed data to include AgentKit transaction details
 * @param {Object} parsedData - The parsed data from the chat component
 * @param {Object} transactionDetails - The transaction details from AgentKit
 * @returns {Object} - The modified parsed data
 */
export function enhanceParsedDataWithAgentKit(parsedData, transactionDetails) {
  if (!parsedData || !transactionDetails) return parsedData;

  // Add AgentKit-specific fields to the parsed data
  return {
    ...parsedData,
    agentKit: {
      ...transactionDetails
    },
    // Ensure the intent matches the transaction type
    intent: transactionDetails.type || parsedData.intent,
    // Use the amount from AgentKit if available
    amount: transactionDetails.amount || parsedData.amount,
    // Use the token from AgentKit if available
    token: transactionDetails.token || parsedData.token || 'ETH',
    // Use the recipients from AgentKit if available
    recipients: transactionDetails.recipients || parsedData.recipients || [],
    // Use the note from AgentKit if available
    note: transactionDetails.note || parsedData.note,
    // Mark this as processed by AgentKit
    parsed_by: 'agentKit'
  };
}

/**
 * Check if a message is a transaction request
 * @param {string} message - The message to check
 * @returns {Promise<boolean>} - Whether the message is a transaction request
 */
export async function isTransactionRequest(message) {
  try {
    const extractedDetails = await extractTransactionDetails(message);
    return !!extractedDetails;
  } catch (error) {
    console.error('Error checking if message is a transaction request:', error);
    return false;
  }
}
