import { BASE_MAINNET, BASE_SEPOLIA } from '../config/networks';

function generatePrivateKey() {
  const randomBytes = new Array(32).fill(0).map(() => Math.floor(Math.random() * 256));
  return '0x' + randomBytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

function privateKeyToAccount(privateKey) {
  const addressBytes = privateKey.slice(2, 42);
  return {
    address: '0x' + addressBytes.padEnd(40, '0'),
    privateKey,
  };
}

export async function createSmartWallet({ networkId = 'base-sepolia', privateKey } = {}) {
  try {
    const walletPrivateKey = privateKey || generatePrivateKey();
    const account = privateKeyToAccount(walletPrivateKey);
    const network = networkId.includes('sepolia') ? BASE_SEPOLIA : BASE_MAINNET;
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

export function storeSmartWallet(smartWallet) {
  try {
    const result = safeLocalStorage.setItem('lucra_smart_wallet', JSON.stringify(smartWallet));
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

export function getStoredSmartWallet() {
  try {
    const smartWallet = safeLocalStorage.getItem('lucra_smart_wallet');
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

export function clearStoredSmartWallet() {
  try {
    return safeLocalStorage.removeItem('lucra_smart_wallet');
  } catch (error) {
    console.error('Error clearing Smart Wallet:', error);
    return false;
  }
}

export function hasStoredSmartWallet() {
  try {
    return !!safeLocalStorage.getItem('lucra_smart_wallet');
  } catch (error) {
    console.error('Error checking for stored Smart Wallet:', error);
    return false;
  }
} 