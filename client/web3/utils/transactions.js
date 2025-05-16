/**
 * Utility functions for handling cryptocurrency transactions
 * This provides functionality for preparing, formatting, and storing transactions
 */
import { parseEther, formatEther } from 'viem';
import { resolveBaseName } from './baseNameResolver';
import { BASE_MAINNET, BASE_SEPOLIA, getExplorerUrl } from '../config/networks';

/**
 * Prepares a transaction for sending
 * @param {Object} transaction - The transaction to prepare
 * @param {string} transaction.to - Recipient address or Base Name
 * @param {string} transaction.amount - Amount to send
 * @param {string} transaction.token - Token symbol (currently only supports ETH)
 * @param {string} transaction.network - Network to use ('base-mainnet' or 'base-sepolia')
 * @returns {Promise<Object>} - Prepared transaction object
 */
export async function prepareTransaction({ to, amount, token = 'ETH', network = 'base-mainnet' }) {
  console.log(`Preparing transaction: to=${to}, amount=${amount}, token=${token}, network=${network}`);

  try {
    // Check if 'to' is a Base Name, and if so, resolve it to an address
    let toAddress = to;
    
    // Ensure 'to' is a string before using string methods
    if (typeof to === 'string' && (to.includes('.base') || to.includes('.eth'))) {
      console.log(`Resolving name: ${to}`);
      const isTestnet = network.includes('sepolia') || network.includes('testnet');
      const resolved = await resolveBaseName(to, isTestnet);
      if (resolved) {
        toAddress = resolved;
        console.log(`Resolved ${to} to ${toAddress}`);
      } else {
        console.warn(`Failed to resolve ${to}, using as-is`);
      }
    }

    // Parse the amount to Wei (for ETH transactions)
    let value;
    if (token === 'ETH') {
      try {
        value = parseEther(amount.toString());
      } catch (error) {
        console.error('Error parsing amount to Wei:', error);
        throw new Error('Invalid amount');
      }
    } else {
      // For other tokens, this would prepare the data for a token transfer
      throw new Error(`Token ${token} not supported yet`);
    }

    // Determine the network configuration
    const networkConfig = network.includes('sepolia') ? BASE_SEPOLIA : BASE_MAINNET;

    return {
      to: toAddress,
      value,
      data: '0x', // For ETH transfers, data is empty
      token,
      network: networkConfig,
    };
  } catch (error) {
    console.error('Error preparing transaction:', error);
    throw error;
  }
}

/**
 * Formats a transaction for display or storage
 * @param {Object} transaction - The transaction to format
 * @param {string} transaction.hash - Transaction hash
 * @param {string} transaction.to - Recipient address
 * @param {string|bigint} transaction.value - Transaction value in Wei
 * @param {Object} transaction.network - Network the transaction was on
 * @returns {Object} - Formatted transaction
 */
export function formatTransaction({ hash, to, value, network = BASE_MAINNET }) {
  console.log(`Formatting transaction: hash=${hash}, to=${to}, network=${network.name || 'unknown'}`);

  // Convert value from Wei to ETH
  let formattedValue;
  try {
    // Use viem's formatEther for proper formatting
    formattedValue = typeof value === 'bigint'
      ? formatEther(value)
      : formatEther(BigInt(value.toString()));
  } catch (error) {
    console.error('Error formatting value:', error);
    formattedValue = '0';
  }

  // Get the explorer URL for the transaction
  const explorerUrl = getExplorerUrl(hash, network);

  // Format the transaction for display
  return {
    hash,
    to,
    value: formattedValue,
    formattedValue: `${Number(formattedValue).toFixed(6)} ETH`,
    network: network.name || 'unknown',
    explorerUrl,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Stores a transaction in Supabase
 * @param {Object} transaction - The transaction to store
 * @param {string} transaction.hash - Transaction hash
 * @param {string} transaction.to - Recipient address
 * @param {number} transaction.value - Transaction value in ETH
 * @param {string} transaction.token - Token symbol
 * @param {string} transaction.walletAddress - Sender wallet address
 * @param {string} transaction.type - Transaction type (e.g., 'send', 'receive')
 * @param {string} transaction.status - Transaction status (e.g., 'pending', 'confirmed')
 * @param {string} transaction.note - Optional note for the transaction
 * @returns {Promise<Object>} - Stored transaction object
 */
export async function storeTransaction({ hash, to, value, token = 'ETH', walletAddress, type = 'send', status = 'pending', note = '' }) {
  console.log(`Storing transaction: hash=${hash}, to=${to}, value=${value}, token=${token}, status=${status}`);

  try {
    // Skip if no wallet address is provided
    if (!walletAddress) {
      console.warn('No wallet address provided, skipping transaction storage');
      return null;
    }

    // Ensure all values are properly formatted
    const payload = {
      transactionHash: hash ? String(hash) : 'pending-' + Date.now(),
      recipientAddress: to ? String(to) : 'unknown',
      amount: value ? String(value) : '0',
      token: token ? String(token) : 'ETH',
      walletAddress: String(walletAddress),
      transactionType: type ? String(type) : 'send',
      status: status ? String(status) : 'pending',
      note: note ? String(note) : '',
    };

    // Call the API to store the transaction
    const response = await fetch('/api/transactions/store', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to store transaction: ${response.status} ${response.statusText}`, errorText);

      // Return a local representation of the transaction
      return {
        id: 'local-' + Math.random().toString(36).substring(2, 15),
        ...payload,
        timestamp: new Date().toISOString(),
        stored: false,
      };
    }

    // Parse the response
    const storedTransaction = await response.json();
    console.log('Transaction stored successfully:', storedTransaction);

    return {
      ...storedTransaction,
      stored: true,
    };
  } catch (error) {
    console.error('Error storing transaction:', error);

    // Return a local representation of the transaction
    return {
      id: 'local-' + Math.random().toString(36).substring(2, 15),
      hash,
      to,
      value,
      token,
      walletAddress,
      type,
      status,
      note,
      timestamp: new Date().toISOString(),
      stored: false,
      error: error.message,
    };
  }
}

