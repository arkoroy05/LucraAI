/**
 * Utility functions for handling cryptocurrency transactions
 * This is a placeholder implementation that will be replaced with actual transaction handling
 */
import { parseEther } from 'viem';
import { resolveBaseName } from './baseNameResolver';

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
    if (to.includes('.base') || to.includes('.eth')) {
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
    // In a real implementation, this would handle different tokens differently
    let value;
    if (token === 'ETH') {
      try {
        value = parseEther(amount);
      } catch (error) {
        console.error('Error parsing amount to Wei:', error);
        throw new Error('Invalid amount');
      }
    } else {
      // For other tokens, this would prepare the data for a token transfer
      throw new Error(`Token ${token} not supported yet`);
    }

    return {
      to: toAddress,
      value: value,
      data: '0x', // For ETH transfers, data is empty
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
export function formatTransaction({ hash, to, value, network }) {
  console.log(`Formatting transaction: hash=${hash}, to=${to}, network=${network.name || 'unknown'}`);

  // Convert value from Wei to ETH
  let formattedValue;
  try {
    // In a real implementation, this would use proper formatting
    formattedValue = typeof value === 'bigint' 
      ? Number(value) / 1e18 
      : Number(value);
  } catch (error) {
    console.error('Error formatting value:', error);
    formattedValue = 0;
  }

  // In a real implementation, this would include more transaction details
  return {
    hash,
    to,
    value: formattedValue,
    formattedValue: `${formattedValue.toFixed(6)} ETH`,
    network: network.name || 'unknown',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Stores a transaction in a database
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
export async function storeTransaction({ hash, to, value, token, walletAddress, type, status, note = '' }) {
  console.log(`Storing transaction: hash=${hash}, to=${to}, value=${value}, token=${token}, status=${status}`);

  // In a real implementation, this would store the transaction in a database
  // Mock implementation just returns the transaction as if it was stored
  const storedTransaction = {
    id: Math.random().toString(36).substring(2, 15),
    hash,
    to,
    value,
    token,
    walletAddress,
    type,
    status,
    note,
    timestamp: new Date().toISOString(),
  };

  console.log(`Transaction stored with ID: ${storedTransaction.id}`);
  return storedTransaction;
}

