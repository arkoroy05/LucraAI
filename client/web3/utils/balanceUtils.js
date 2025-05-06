'use client'

import { formatUnits } from 'viem'

/**
 * Formats a balance with the appropriate number of decimal places
 * @param {bigint} balance - The balance in wei
 * @param {number} decimals - The number of decimals for the token
 * @param {number} displayDecimals - The number of decimals to display
 * @returns {string} - The formatted balance
 */
export function formatBalance(balance, decimals = 18, displayDecimals = 4) {
  if (balance === undefined || balance === null) return '0'
  
  try {
    const formatted = formatUnits(balance, decimals)
    
    // Parse to float and fix to displayDecimals
    const number = parseFloat(formatted)
    return number.toFixed(displayDecimals)
  } catch (error) {
    console.error('Error formatting balance:', error)
    return '0'
  }
}

/**
 * Formats a token amount for display
 * @param {number|string} amount - The amount to format
 * @param {string} symbol - The token symbol
 * @returns {string} - The formatted amount with symbol
 */
export function formatTokenAmount(amount, symbol = 'ETH') {
  if (!amount) return `0 ${symbol}`
  
  // Convert to number if it's a string
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  
  // Format with commas for thousands
  const formatted = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 6,
    minimumFractionDigits: 2
  }).format(numAmount)
  
  return `${formatted} ${symbol}`
}

/**
 * Gets the token symbol based on the token address
 * @param {string} tokenAddress - The token address
 * @returns {string} - The token symbol
 */
export function getTokenSymbol(tokenAddress) {
  // Common token addresses and their symbols
  const tokens = {
    '0x0000000000000000000000000000000000000000': 'ETH',
    '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48': 'USDC', // USDC on Ethereum
    '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913': 'USDC', // USDC on Base
    '0x4200000000000000000000000000000000000006': 'WETH', // WETH on Base
    // Add more tokens as needed
  }
  
  return tokens[tokenAddress] || 'Unknown'
}

/**
 * Formats a wallet address for display
 * @param {string} address - The wallet address
 * @param {number} prefixLength - The number of characters to show at the beginning
 * @param {number} suffixLength - The number of characters to show at the end
 * @returns {string} - The formatted address
 */
export function formatAddress(address, prefixLength = 6, suffixLength = 4) {
  if (!address) return ''
  if (address.length <= prefixLength + suffixLength) return address
  
  return `${address.slice(0, prefixLength)}...${address.slice(-suffixLength)}`
}
