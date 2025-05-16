"use client"

import { useState, useCallback } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { useTransactions } from '@/web3';
import { getNetworkByChainId, BASE_SEPOLIA } from '@/web3/config/networks';

/**
 * Custom hook for AI-powered transactions
 * @returns {object} - AI transaction functions and state
 */
export function useAITransactions() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { sendPayment, splitPayment } = useTransactions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);
  const [lastResponse, setLastResponse] = useState(null);

  // Determine if we're using the testnet
  const network = getNetworkByChainId(chainId);
  const useTestnet = network?.id === BASE_SEPOLIA.id;

  /**
   * Process a message with AI to extract and execute transaction details
   * @param {string} message - User's message
   * @returns {Promise<object>} - Processing result
   */
  const processMessage = useCallback(async (message) => {
    try {
      setIsProcessing(true);
      setError(null);

      // Ensure we have a valid address
      if (!address) {
        throw new Error('Wallet not connected. Please connect your wallet first.');
      }

      console.log('Processing message with AI:', message);
      console.log('Using wallet address:', address);
      console.log('Using testnet:', useTestnet);

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: message }],
          walletAddress: address,
          useTestnet: useTestnet || false,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API response error:', response.status, errorText);
        throw new Error(`Failed to process message: ${response.statusText}`);
      }

      // Get the parsed data from the custom header
      const parsedDataHeader = response.headers.get('X-Parsed-Data');
      let data = { type: 'message' };

      // Get the response text first so we don't consume the body twice
      const responseText = await response.text();

      if (parsedDataHeader) {
        try {
          const parsedData = JSON.parse(parsedDataHeader);
          console.log('Parsed data from header:', parsedData);

          // If this is a transaction intent, format it properly
          if (parsedData.intent === 'send' || parsedData.intent === 'split') {
            data = {
              type: 'transaction',
              details: {
                type: parsedData.intent,
                amount: parsedData.amount || 0.1,
                token: parsedData.token || 'ETH',
                recipient: parsedData.recipients?.[0] || 'unknown',
                recipients: parsedData.recipients || [],
                note: parsedData.note
              },
              agentResponse: {
                response: responseText
              }
            };
          } else {
            // For non-transaction intents
            data = {
              type: 'message',
              agentResponse: {
                response: responseText
              }
            };
          }
        } catch (err) {
          console.error('Error parsing X-Parsed-Data header:', err);
          // Use the response text as a regular message
          data = {
            type: 'message',
            agentResponse: {
              response: responseText
            }
          };
        }
      } else {
        // No parsed data header, just use the response text
        data = {
          type: 'message',
          agentResponse: {
            response: responseText
          }
        };
      }

      setLastResponse(data);

      // If this is a transaction, execute it
      if (data.type === 'transaction') {
        const { details } = data;

        try {
          console.log('Executing transaction:', details);

          if (details.type === 'send') {
            if (!details.recipient || details.recipient === 'unknown') {
              throw new Error('Invalid recipient address');
            }

            await sendPayment({
              to: details.recipient,
              amount: details.amount,
              token: details.token || 'ETH',
              note: details.note || ''
            });

            console.log('Send payment executed successfully');
          } else if (details.type === 'split') {
            if (!details.recipients || details.recipients.length === 0) {
              throw new Error('No recipients specified for split payment');
            }

            // splitPayment expects separate parameters, not an object
            await splitPayment(
              details.recipients,
              details.amount,
              details.token || 'ETH',
              details.note || ''
            );

            console.log('Split payment executed successfully');
          } else {
            console.warn('Unknown transaction type:', details.type);
          }
        } catch (txError) {
          console.error('Error executing transaction:', txError);
          // Don't throw here, we'll still return the data with the AI response
          // but we'll add the error to the data
          data.error = txError.message;
        }
      }

      return data;
    } catch (error) {
      console.error('Error processing AI transaction:', error);
      setError(error.message || 'Failed to process transaction');
      return {
        type: 'error',
        error: error.message,
        agentResponse: {
          response: `I'm sorry, but I encountered an error: ${error.message}`
        }
      };
    } finally {
      setIsProcessing(false);
    }
  }, [address, useTestnet, sendPayment, splitPayment]);

  /**
   * Check if a message appears to be a transaction request
   * @param {string} message - User's message
   * @returns {boolean} - True if the message appears to be a transaction request
   */
  const isTransactionRequest = useCallback((message) => {
    const transactionKeywords = [
      'send',
      'transfer',
      'pay',
      'split',
      'eth',
      'ether',
      'transaction',
    ];

    const lowerMessage = message.toLowerCase();
    return transactionKeywords.some(keyword => lowerMessage.includes(keyword));
  }, []);

  return {
    processMessage,
    isTransactionRequest,
    isProcessing,
    error,
    lastResponse,
  };
}
