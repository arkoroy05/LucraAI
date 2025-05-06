'use client'

import { useState, useEffect } from 'react'
import { useAccount, useBalance, useReadContract } from 'wagmi'
import { formatBalance, formatTokenAmount } from '../utils/balanceUtils'

/**
 * Custom hook to fetch wallet balances
 * @param {string} tokenAddress - Optional token address to fetch balance for
 * @returns {Object} - Object containing balance information
 */
export function useWalletBalance(tokenAddress) {
  const { address, isConnected } = useAccount()
  const [formattedBalance, setFormattedBalance] = useState('0')
  const [formattedNativeBalance, setFormattedNativeBalance] = useState('0')
  const [balances, setBalances] = useState({})
  
  // Fetch native token balance (ETH)
  const { 
    data: nativeBalance,
    isLoading: isNativeBalanceLoading,
    error: nativeBalanceError,
    refetch: refetchNativeBalance
  } = useBalance({
    address,
    enabled: isConnected && !!address,
  })
  
  // Fetch ERC20 token balance if tokenAddress is provided
  const { 
    data: tokenBalance,
    isLoading: isTokenBalanceLoading,
    error: tokenBalanceError,
    refetch: refetchTokenBalance
  } = useBalance({
    address,
    token: tokenAddress,
    enabled: isConnected && !!address && !!tokenAddress,
  })
  
  // Format balances when they change
  useEffect(() => {
    if (nativeBalance) {
      const formatted = formatBalance(nativeBalance.value, nativeBalance.decimals)
      setFormattedNativeBalance(formatted)
      setBalances(prev => ({
        ...prev,
        native: {
          value: nativeBalance.value,
          formatted,
          symbol: nativeBalance.symbol,
          display: `${formatted} ${nativeBalance.symbol}`
        }
      }))
    }
    
    if (tokenBalance) {
      const formatted = formatBalance(tokenBalance.value, tokenBalance.decimals)
      setFormattedBalance(formatted)
      setBalances(prev => ({
        ...prev,
        [tokenAddress]: {
          value: tokenBalance.value,
          formatted,
          symbol: tokenBalance.symbol,
          display: `${formatted} ${tokenBalance.symbol}`
        }
      }))
    }
  }, [nativeBalance, tokenBalance, tokenAddress])
  
  // Refresh balances
  const refreshBalances = () => {
    refetchNativeBalance()
    if (tokenAddress) {
      refetchTokenBalance()
    }
  }
  
  return {
    // Native balance (ETH)
    nativeBalance: nativeBalance?.value,
    formattedNativeBalance,
    nativeSymbol: nativeBalance?.symbol || 'ETH',
    nativeDisplayBalance: nativeBalance ? `${formattedNativeBalance} ${nativeBalance.symbol}` : '0 ETH',
    isNativeBalanceLoading,
    nativeBalanceError,
    
    // Token balance (if tokenAddress provided)
    tokenBalance: tokenBalance?.value,
    formattedBalance,
    tokenSymbol: tokenBalance?.symbol,
    displayBalance: tokenBalance ? `${formattedBalance} ${tokenBalance.symbol}` : null,
    isTokenBalanceLoading,
    tokenBalanceError,
    
    // All balances
    balances,
    
    // Utilities
    refreshBalances,
    isLoading: isNativeBalanceLoading || isTokenBalanceLoading,
    hasError: !!nativeBalanceError || !!tokenBalanceError
  }
}
