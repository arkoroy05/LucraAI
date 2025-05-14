/**
 * Smart Wallet utilities for LucraAI
 * This provides functionality for creating and managing Smart Wallets
 *
 * Note: This is a mock implementation for development purposes
 */

import { BASE_MAINNET, BASE_SEPOLIA } from '../config/networks';

// Mock implementation of viem/accounts functions
function generatePrivateKey() {
  // Generate a random 32-byte private key
  const randomBytes = new Array(32).fill(0).map(() => Math.floor(Math.random() * 256));
  return '0x' + randomBytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

function privateKeyToAccount(privateKey) {
  // Generate a deterministic address from the private key
  // This is a simplified mock implementation
  const addressBytes = privateKey.slice(2, 42);
  return {
    address: '0x' + addressBytes.padEnd(40, '0'),
    privateKey,
  };
}

/**
 * Creates a new Smart Wallet
 * @param {object} options - Options for creating the Smart Wallet
 * @param {string} options.networkId - Network ID (e.g., 'base-mainnet', 'base-sepolia')
 * @param {string} options.privateKey - Optional private key to use for the Smart Wallet
 * @returns {Promise<object>} - Smart Wallet object
 */
export async function createSmartWallet({ networkId = 'base-sepolia', privateKey } = {}) {
  try {
    // Generate a new private key if one wasn't provided
    const walletPrivateKey = privateKey || generatePrivateKey();

    // Create an account from the private key
    const account = privateKeyToAccount(walletPrivateKey);

    // Determine the network configuration
    const network = networkId.includes('sepolia') ? BASE_SEPOLIA : BASE_MAINNET;

    // Create a Smart Wallet object
    const smartWallet = {
      address: account.address,
      privateKey: walletPrivateKey,
      network,
      createdAt: new Date().toISOString(),
    };

    return smartWallet;
  } catch (error) {
    console.error('Error creating Smart Wallet:', error);
    throw error;
  }
}

/**
 * Safely access localStorage with fallback
 * This helps prevent issues with service workers or other browser restrictions
 */
const safeLocalStorage = {
  getItem: (key) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return null;
    } catch (error) {
      console.error('Error accessing localStorage.getItem:', error);
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error accessing localStorage.setItem:', error);
      return false;
    }
  },
  removeItem: (key) => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error accessing localStorage.removeItem:', error);
      return false;
    }
  }
};

/**
 * Stores a Smart Wallet in local storage
 * @param {object} smartWallet - Smart Wallet object to store
 * @returns {boolean} - True if the Smart Wallet was stored successfully
 */
export function storeSmartWallet(smartWallet) {
  try {
    // Store the Smart Wallet in local storage
    const result = safeLocalStorage.setItem('lucra_smart_wallet', JSON.stringify(smartWallet));

    // Verify the data was stored correctly
    const verification = safeLocalStorage.getItem('lucra_smart_wallet');
    if (!verification) {
      console.warn('Smart Wallet storage verification failed');
      return false;
    }

    return result;
  } catch (error) {
    console.error('Error storing Smart Wallet:', error);
    return false;
  }
}

/**
 * Retrieves a Smart Wallet from local storage
 * @returns {object|null} - Smart Wallet object or null if not found
 */
export function getStoredSmartWallet() {
  try {
    // Retrieve the Smart Wallet from local storage
    const smartWallet = safeLocalStorage.getItem('lucra_smart_wallet');

    // Add additional logging for debugging
    if (!smartWallet) {
      console.log('No Smart Wallet found in localStorage');
      return null;
    }

    try {
      return JSON.parse(smartWallet);
    } catch (parseError) {
      console.error('Error parsing Smart Wallet JSON:', parseError);
      return null;
    }
  } catch (error) {
    console.error('Error retrieving Smart Wallet:', error);
    return null;
  }
}

/**
 * Clears a stored Smart Wallet from local storage
 * @returns {boolean} - True if the Smart Wallet was cleared successfully
 */
export function clearStoredSmartWallet() {
  try {
    // Clear the Smart Wallet from local storage
    return safeLocalStorage.removeItem('lucra_smart_wallet');
  } catch (error) {
    console.error('Error clearing Smart Wallet:', error);
    return false;
  }
}

/**
 * Checks if a Smart Wallet is stored in local storage
 * @returns {boolean} - True if a Smart Wallet is stored
 */
export function hasStoredSmartWallet() {
  try {
    // Check if a Smart Wallet is stored in local storage
    return !!safeLocalStorage.getItem('lucra_smart_wallet');
  } catch (error) {
    console.error('Error checking for stored Smart Wallet:', error);
    return false;
  }
}
