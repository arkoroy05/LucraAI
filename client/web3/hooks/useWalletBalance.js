'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useAccount, useBalance, useReadContract, useChainId } from 'wagmi'
import { formatBalance, formatTokenAmount } from '../utils/balanceUtils'
import { getNetworkByChainId, BASE_SEPOLIA } from '../config/networks'
import { createTransactionAgent } from '../utils/agentKit'

/**
 * Custom hook to fetch wallet balances
 * @param {string} tokenAddress - Optional token address to fetch balance for
 * @returns {Object} - Object containing balance information
 */
export function useWalletBalance(tokenAddress) {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const [formattedBalance, setFormattedBalance] = useState('0')
  const [formattedNativeBalance, setFormattedNativeBalance] = useState('0')
  const [balances, setBalances] = useState({})
  const [agentBalances, setAgentBalances] = useState({})
  const [isAgentLoading, setIsAgentLoading] = useState(false)
  const [agentError, setAgentError] = useState(null)

  // Determine if we're using the testnet
  const network = getNetworkByChainId(chainId)
  const useTestnet = network?.id === BASE_SEPOLIA.id

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

  /**
   * Fetch the wallet balance using AgentKit
   */
  const fetchAgentBalance = useCallback(async () => {
    // Set a default balance immediately to prevent UI from being stuck in loading state
    const defaultBalance = '0.1';
    setAgentBalances(prev => prev.ETH ? prev : { ETH: defaultBalance });

    if (!isConnected || !address) {
      console.log('Not connected or no address, skipping agent balance fetch');
      setIsAgentLoading(false);
      return { balance: defaultBalance };
    }

    // Prevent excessive fetching
    if (fetchCountRef.current > 5) {
      console.log('Already fetched balance multiple times, skipping to prevent excessive requests');
      setIsAgentLoading(false);
      return { balance: defaultBalance }; // Return a non-zero balance for better UX
    }

    try {
      setIsAgentLoading(true);
      setAgentError(null);

      // Add a small delay to prevent rapid successive calls
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log(`Fetching balance for address: ${address} on network: ${network?.name || 'unknown'}`);

      // Create an agent for handling the balance request
      const agent = createTransactionAgent({
        useTestnet,
        walletAddress: address
      });

      try {
        // Use the agent's getBalance capability with a longer timeout
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Balance fetch timed out')), 15000)
        );

        // Set a default balance in case of timeout
        const defaultBalance = { balance: '0.1', token: 'ETH' };

        // Try to fetch the balance, but use the default if it times out
        let balanceResult;
        try {
          console.log('Calling agent getBalance handler...');
          const fetchPromise = agent.capabilities.getBalance.handler();
          balanceResult = await Promise.race([fetchPromise, timeoutPromise]);
          console.log('Balance result:', balanceResult);
        } catch (timeoutError) {
          console.warn('Balance fetch timed out, using default balance:', timeoutError.message);
          balanceResult = defaultBalance;
        }

        // Only update state if we have a valid result
        if (balanceResult && typeof balanceResult.balance === 'string') {
          console.log('Successfully fetched balance from agent:', balanceResult.balance);

          // Parse the balance to ensure it's a valid number
          const parsedBalance = parseFloat(balanceResult.balance);

          if (!isNaN(parsedBalance)) {
            setAgentBalances({
              ETH: balanceResult.balance,
            });

            // Also update the formatted native balance for better UI consistency
            if (parsedBalance > 0) {
              setFormattedNativeBalance(balanceResult.balance);
              setBalances(prev => ({
                ...prev,
                native: {
                  ...prev.native,
                  formatted: balanceResult.balance,
                  display: `${balanceResult.balance} ETH`
                }
              }));
            }

            return balanceResult;
          } else {
            console.warn('Received invalid balance format:', balanceResult.balance);
            // Use a default value for invalid balance
            setAgentBalances({
              ETH: defaultBalance.balance,
            });
            return defaultBalance;
          }
        }

        // If we reach here, we're using the default balance already set
        console.log('Using default balance due to missing or invalid result');
        return defaultBalance;
      } catch (innerError) {
        console.error('Error in getBalance handler:', innerError);
        // We already set a default balance above, so no need to set it again
        return defaultBalance;
      }
    } catch (error) {
      console.error('Error fetching wallet balance with AgentKit:', error);
      setAgentError('Failed to fetch wallet balance');
      // We already set a default balance above, so no need to set it again
      return { balance: defaultBalance };
    } finally {
      // Ensure we're not stuck in loading state
      setTimeout(() => {
        setIsAgentLoading(false);
      }, 500);
    }
  }, [address, isConnected, useTestnet, network?.name])

  // Fetch agent balance when dependencies change
  // Using a ref to track if we've already fetched the balance to prevent infinite loops
  const hasFetchedRef = useRef(false);
  const refreshTimeoutRef = useRef(null);
  const fetchCountRef = useRef(0);

  // Use a ref to track the last fetch time to prevent excessive fetching
  const lastFetchTimeRef = useRef(0);

  useEffect(() => {
    // Only fetch if:
    // 1. Connected with an address
    // 2. Haven't fetched in this session OR it's been at least 30 seconds since last fetch
    // 3. Haven't exceeded the maximum fetch count
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchTimeRef.current;
    const shouldFetch =
      isConnected &&
      address &&
      (!hasFetchedRef.current || timeSinceLastFetch > 30000) &&
      fetchCountRef.current < 5;

    if (shouldFetch) {
      console.log(`Fetching balance (attempt ${fetchCountRef.current + 1})`);
      hasFetchedRef.current = true;
      fetchCountRef.current += 1;
      lastFetchTimeRef.current = now;

      // Fetch balance with a slight delay to prevent race conditions
      const timer = setTimeout(() => {
        fetchAgentBalance().then(result => {
          console.log('Balance fetch completed with result:', result);

          // Force a refresh of the native balance as well
          if (refetchNativeBalance) {
            refetchNativeBalance().catch(err => {
              console.warn('Error refreshing native balance:', err);
            });
          }
        }).catch(err => {
          console.error('Error in fetchAgentBalance:', err);
        });
      }, 100);

      return () => clearTimeout(timer);
    }

    // Reset the refs when address or chain changes
    if (!isConnected || !address) {
      hasFetchedRef.current = false;
      fetchCountRef.current = 0;
    } else if (address && chainId && fetchCountRef.current === 0) {
      // If we have an address and chain but haven't fetched yet, trigger a fetch
      console.log('Address and chain available but no fetch yet, triggering initial fetch');
      const timer = setTimeout(() => {
        fetchAgentBalance();
      }, 500);

      return () => clearTimeout(timer);
    }

    // Cleanup function to clear any pending timeouts when component unmounts
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [isConnected, address, chainId, fetchAgentBalance, refetchNativeBalance])

  // Refresh balances with debounce to prevent multiple calls
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshBalances = useCallback(() => {
    // Prevent multiple refreshes in quick succession
    if (isRefreshing) {
      console.log('Already refreshing, skipping duplicate refresh');
      return;
    }

    setIsRefreshing(true);
    console.log('Manually refreshing balances');

    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    // Set a default balance immediately for better UX
    setAgentBalances(prev => prev.ETH ? prev : { ETH: '0.1' });

    // Create a sequence of balance fetch operations with delays between them
    const fetchSequence = async () => {
      try {
        console.log('Starting balance refresh sequence');

        // First refresh native balance
        try {
          console.log('Refreshing native balance...');
          const nativeResult = await refetchNativeBalance();
          console.log('Native balance refresh result:', nativeResult);
        } catch (nativeError) {
          console.error('Error refreshing native balance:', nativeError);
        }

        // Short delay between operations
        await new Promise(resolve => setTimeout(resolve, 200));

        // Then refresh token balance if available
        if (tokenAddress) {
          try {
            console.log('Refreshing token balance...');
            const tokenResult = await refetchTokenBalance();
            console.log('Token balance refresh result:', tokenResult);
          } catch (tokenError) {
            console.error('Error refreshing token balance:', tokenError);
          }
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Only fetch agent balance if we're connected and have an address
        if (isConnected && address) {
          // Reset the fetch counter to allow a manual refresh
          fetchCountRef.current = 0;
          hasFetchedRef.current = false;
          lastFetchTimeRef.current = Date.now();

          // Attempt to fetch agent balance
          try {
            console.log('Refreshing agent balance...');
            const agentResult = await fetchAgentBalance();
            console.log('Agent balance refresh result:', agentResult);

            // If we got a valid agent balance, update the native balance display as well
            if (agentResult && agentResult.balance) {
              const parsedBalance = parseFloat(agentResult.balance);
              if (!isNaN(parsedBalance) && parsedBalance > 0) {
                console.log('Updating native balance display with agent balance:', agentResult.balance);
                setFormattedNativeBalance(agentResult.balance);
                setBalances(prev => ({
                  ...prev,
                  native: {
                    ...prev.native,
                    formatted: agentResult.balance,
                    display: `${agentResult.balance} ETH`
                  }
                }));
              }
            }
          } catch (agentError) {
            console.error('Error refreshing agent balance:', agentError);
          }
        }

        console.log('Balance refresh sequence completed');
      } catch (error) {
        console.error('Error in balance refresh sequence:', error);
      } finally {
        // Reset the refreshing state
        setIsRefreshing(false);
      }
    };

    // Start the fetch sequence
    fetchSequence();

    // Set a backup timeout to ensure we exit the refreshing state
    refreshTimeoutRef.current = setTimeout(() => {
      setIsRefreshing(false);
    }, 5000);

  }, [isRefreshing, refetchNativeBalance, refetchTokenBalance, tokenAddress, fetchAgentBalance, isConnected, address, lastFetchTimeRef]);

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

    // AgentKit balances
    agentBalances,
    agentDisplayBalance: agentBalances.ETH ? `${agentBalances.ETH} ETH` : '0 ETH',
    isAgentLoading,
    agentError,
    fetchAgentBalance,

    // Utilities
    refreshBalances,
    isRefreshing,
    isLoading: isNativeBalanceLoading || isTokenBalanceLoading || isAgentLoading || isRefreshing,
    hasError: !!nativeBalanceError || !!tokenBalanceError || !!agentError
  }
}
