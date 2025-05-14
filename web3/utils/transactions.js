/**
 * Transaction utilities for LucraAI
 * This provides functionality for sending and tracking transactions
 */

import { parseEther, formatEther } from 'viem';
import { getExplorerUrl, BASE_MAINNET, BASE_SEPOLIA } from '../config/networks';
import { resolveBaseName } from './baseName';

/**
 * Prepares a transaction for sending
 * @param {object} transaction - Transaction object
 * @param {string} transaction.to - Recipient address or Base Name
 * @param {string|number} transaction.amount - Amount to send in ETH
 * @param {string} transaction.token - Token symbol (currently only supports ETH)
 * @param {string} transaction.network - Network to use (base-mainnet or base-sepolia)
 * @returns {Promise<object>} - Prepared transaction object
 */
export async function prepareTransaction({ to, amount, token = 'ETH', network = 'base-mainnet' }) {
  try {
    // Resolve the recipient address if it's a Base Name
    const resolvedTo = await resolveBaseName(to);

    if (!resolvedTo) {
      throw new Error(`Could not resolve recipient address: ${to}`);
    }

    // Parse the amount to wei
    const value = parseEther(amount.toString());

    // Determine the network configuration
    const networkConfig = network.includes('sepolia') ? BASE_SEPOLIA : BASE_MAINNET;

    // Prepare the transaction object
    const preparedTransaction = {
      to: resolvedTo,
      value,
      token,
      network: networkConfig,
    };

    return preparedTransaction;
  } catch (error) {
    console.error('Error preparing transaction:', error);
    throw error;
  }
}

/**
 * Formats a transaction for display
 * @param {object} transaction - Transaction object
 * @param {string} transaction.hash - Transaction hash
 * @param {string} transaction.to - Recipient address
 * @param {string|bigint} transaction.value - Amount sent in wei
 * @param {object} transaction.network - Network configuration object
 * @returns {object} - Formatted transaction object
 */
export function formatTransaction({ hash, to, value, network = BASE_MAINNET }) {
  try {
    // Format the amount from wei to ETH
    const formattedValue = typeof value === 'bigint'
      ? formatEther(value)
      : formatEther(BigInt(value));

    // Get the explorer URL for the transaction
    const explorerUrl = getExplorerUrl(hash, network);

    // Format the transaction object
    const formattedTransaction = {
      hash,
      to,
      value: formattedValue,
      explorerUrl,
      network: network.name,
    };

    return formattedTransaction;
  } catch (error) {
    console.error('Error formatting transaction:', error);
    throw error;
  }
}

/**
 * Stores a transaction in Supabase
 * @param {object} transaction - Transaction object
 * @param {string} transaction.hash - Transaction hash
 * @param {string} transaction.to - Recipient address
 * @param {string} transaction.value - Amount sent in ETH
 * @param {string} transaction.token - Token symbol
 * @param {string} transaction.walletAddress - Sender wallet address
 * @param {string} transaction.type - Transaction type (send, receive, etc.)
 * @param {string} transaction.status - Transaction status (pending, confirmed, etc.)
 * @param {string} transaction.note - Optional note for the transaction
 * @returns {Promise<boolean>} - True if the transaction was stored successfully
 */
export async function storeTransaction({
  hash,
  to,
  value,
  token = 'ETH',
  walletAddress,
  type = 'send',
  status = 'pending',
  note = ''
}) {
  try {
    // Skip if no wallet address is provided
    if (!walletAddress) {
      console.log('No wallet address provided, skipping transaction storage');
      return false;
    }

    // Call the API to store the transaction
    const response = await fetch('/api/transactions/store', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transactionHash: hash || 'pending-' + Date.now(),
        recipientAddress: to || 'unknown',
        amount: value || '0',
        token: token || 'ETH',
        walletAddress,
        transactionType: type || 'send',
        status: status || 'pending',
        note: note || '',
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to store transaction: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    console.error('Error storing transaction:', error);
    return false;
  }
}
