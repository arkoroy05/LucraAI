"use client"

import { useState, useCallback } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { useTransactions } from '@/web3';
import { getNetworkByChainId, BASE_SEPOLIA } from '../../web3';

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


      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: message }],
          walletAddress: address || '',
          useTestnet: useTestnet || false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to process message: ${response.statusText}`);
      }

      // Get the parsed data from the custom header
      const parsedDataHeader = response.headers.get('X-Parsed-Data');
      let data = { type: 'message' };

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
                response: await response.text()
              }
            };
          }
        } catch (err) {
          console.error('Error parsing X-Parsed-Data header:', err);
        }
      }

      setLastResponse(data);

      // If this is a transaction, execute it
      if (data.type === 'transaction') {
        const { details } = data;

        if (details.type === 'send') {
          await sendPayment(
            details.recipient,
            details.amount,
            details.token || 'ETH'
          );
        } else if (details.type === 'split') {
          await splitPayment(
            details.recipients,
            details.amount,
            details.token || 'ETH'
          );
        }
      }

      return data;
    } catch (error) {
      console.error('Error processing AI transaction:', error);
      setError(error.message || 'Failed to process transaction');
      return { type: 'error', error: error.message };
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
