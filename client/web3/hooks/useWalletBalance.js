'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useAccount, useBalance, useReadContract, useChainId } from 'wagmi'
import { formatEther } from 'viem'
import { formatBalance, formatTokenAmount } from '../utils/balanceUtils'
import { getNetworkByChainId, BASE_SEPOLIA } from '../config/networks'
import { createTransactionAgent } from '../utils/agentKit'

/**
 * Custom hook to fetch wallet balances
 * @param {string} tokenAddress - Optional token address to fetch balance for
 * @param {string} smartWalletAddress - Optional smart wallet address to fetch balance for
 * @returns {Object} - Object containing balance information
 */
export function useWalletBalance(tokenAddress, smartWalletAddress) {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const [formattedBalance, setFormattedBalance] = useState('0')
  const [formattedNativeBalance, setFormattedNativeBalance] = useState('0')
  const [balances, setBalances] = useState({})
  const [agentBalances, setAgentBalances] = useState({})
  const [isAgentLoading, setIsAgentLoading] = useState(false)
  const [agentError, setAgentError] = useState(null)

  // Use smart wallet address if provided, otherwise use connected wallet address
  const targetAddress = smartWalletAddress || address

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
    address: targetAddress,
    enabled: (isConnected && !!targetAddress),
  })

  // Fetch ERC20 token balance if tokenAddress is provided
  const {
    data: tokenBalance,
    isLoading: isTokenBalanceLoading,
    error: tokenBalanceError,
    refetch: refetchTokenBalance
  } = useBalance({
    address: targetAddress,
    token: tokenAddress,
    enabled: (isConnected && !!targetAddress && !!tokenAddress),
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
    const defaultBalance = '0';
    setAgentBalances(prev => prev.ETH ? prev : { ETH: defaultBalance });

    if (!isConnected || !targetAddress) {
      console.log('Not connected or no address, skipping agent balance fetch');
      setIsAgentLoading(false);
      return { balance: defaultBalance };
    }

    // Prevent excessive fetching
    if (fetchCountRef.current > 5) {
      console.log('Already fetched balance multiple times, skipping to prevent excessive requests');
      setIsAgentLoading(false);
      return { balance: defaultBalance }; // Return a default balance for better UX
    }

    try {
      setIsAgentLoading(true);
      setAgentError(null);

      // Add a small delay to prevent rapid successive calls
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log(`Fetching balance for address: ${targetAddress} on network: ${network?.name || 'unknown'}`);

      // Create an agent for handling the balance request
      const agent = createTransactionAgent({
        useTestnet,
        walletAddress: targetAddress // Use the target address here
      });

      try {
        // Use the agent's getBalance capability with a longer timeout
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Balance fetch timed out')), 15000)
        );

        // Set a default balance in case of timeout
        const defaultBalance = { balance: '0', token: 'ETH' };

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

        // Check if we have an error in the result
        if (balanceResult && balanceResult.error) {
          console.warn('Error in balance result:', balanceResult.error);
          setAgentError(balanceResult.error);
        }

        // Only update state if we have a valid result
        if (balanceResult && typeof balanceResult.balance === 'string') {
          console.log('Successfully fetched balance from agent:', balanceResult.balance);

          // Parse the balance to ensure it's a valid number
          const parsedBalance = parseFloat(balanceResult.balance);

          if (!isNaN(parsedBalance)) {
            // Update agent balances state
            setAgentBalances({
              ETH: balanceResult.balance,
            });

            // Also update the formatted native balance for better UI consistency
            // This ensures the balance is displayed correctly in the chat
            setFormattedNativeBalance(balanceResult.balance);
            setBalances(prev => ({
              ...prev,
              native: {
                ...prev.native,
                formatted: balanceResult.balance,
                display: `${balanceResult.balance} ETH`
              }
            }));

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
        setAgentError('Failed to fetch wallet balance: ' + (innerError.message || 'Unknown error'));
        // We already set a default balance above, so no need to set it again
        return defaultBalance;
      }
    } catch (error) {
      console.error('Error fetching wallet balance with AgentKit:', error);
      setAgentError('Failed to fetch wallet balance: ' + (error.message || 'Unknown error'));
      // We already set a default balance above, so no need to set it again
      return { balance: defaultBalance };
    } finally {
      // Ensure we're not stuck in loading state
      setTimeout(() => {
        setIsAgentLoading(false);
      }, 500);
    }
  }, [targetAddress, isConnected, useTestnet, network?.name])

  // Fetch agent balance when dependencies change
  // Using a ref to track if we've already fetched the balance to prevent infinite loops
  const hasFetchedRef = useRef(false);
  const refreshTimeoutRef = useRef(null);
  const fetchCountRef = useRef(0);

  // Use a ref to track the last fetch time to prevent excessive fetching
  const lastFetchTimeRef = useRef(0);

  // Track if we should fetch on mount
  const [shouldFetchOnMount, setShouldFetchOnMount] = useState(true);

  useEffect(() => {
    // Only fetch once on mount or when dependencies change significantly
    // This prevents continuous fetching loops
    if (!isConnected || !targetAddress) {
      // Reset fetch state when disconnected or address changes
      hasFetchedRef.current = false;
      fetchCountRef.current = 0;
      return;
    }

    // Only fetch if we haven't fetched yet or if we're explicitly told to fetch on mount
    if ((!hasFetchedRef.current || shouldFetchOnMount) && fetchCountRef.current < 5) {
      console.log(`Initial balance fetch for ${targetAddress}`);

      // Mark as fetched and increment counter
      hasFetchedRef.current = true;
      fetchCountRef.current += 1;
      lastFetchTimeRef.current = Date.now();

      // Turn off the mount fetch flag after first fetch
      setShouldFetchOnMount(false);

      // Fetch with a slight delay to prevent race conditions
      const timer = setTimeout(() => {
        // First fetch native balance using wagmi
        if (refetchNativeBalance) {
          refetchNativeBalance().catch(err => {
            console.warn('Error refreshing native balance:', err);
          });
        }

        // Then fetch agent balance
        fetchAgentBalance().then(result => {
          console.log('Initial balance fetch completed with result:', result);

          // If we got a valid balance, update the formatted native balance
          if (result && result.balance && parseFloat(result.balance) > 0) {
            console.log(`Updating native balance display with: ${result.balance} ETH`);
            setFormattedNativeBalance(result.balance);
          }
        }).catch(err => {
          console.error('Error in initial fetchAgentBalance:', err);
        });
      }, 500);

      return () => clearTimeout(timer);
    }

    // Cleanup function
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [isConnected, targetAddress, chainId, fetchAgentBalance, refetchNativeBalance, setFormattedNativeBalance, shouldFetchOnMount])

  // Refresh balances with debounce to prevent multiple calls
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshBalances = useCallback((forceRefresh = false, walletType = 'both') => {
    // Return a promise that resolves when the balance refresh is complete
    return new Promise((resolve, reject) => {
      // Prevent multiple refreshes in quick succession unless forced
      if (isRefreshing && !forceRefresh) {
        console.log('Already refreshing, skipping duplicate refresh');
        return resolve({ status: 'skipped', message: 'Already refreshing' });
      }

      // Check if we've refreshed recently (within last 10 seconds) and not forcing refresh
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchTimeRef.current;
      if (!forceRefresh && timeSinceLastFetch < 10000 && hasFetchedRef.current) {
        console.log('Recently refreshed, skipping duplicate refresh');
        return resolve({
          status: 'recent',
          message: 'Recently refreshed',
          balances: {
            native: balances.native,
            agent: agentBalances
          }
        });
      }

      setIsRefreshing(true);
      console.log(`Manually refreshing balances (walletType: ${walletType})`);

      // Clear any existing timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }

      // Create a sequence of balance fetch operations
      const fetchSequence = async () => {
        try {
          console.log('Starting balance refresh sequence');
          let result = { status: 'success', balances: {} };

          // First refresh native balance if requested
          if (walletType === 'both' || walletType === 'main' || walletType === 'connected') {
            try {
              console.log('Refreshing native balance...');
              const nativeResult = await refetchNativeBalance();
              console.log('Native balance refresh result:', nativeResult);
              result.balances.native = nativeResult;
            } catch (nativeError) {
              console.error('Error refreshing native balance:', nativeError);
              result.nativeError = nativeError.message;
            }
          }

          // Then refresh token balance if available and requested
          if (tokenAddress && (walletType === 'both' || walletType === 'token')) {
            try {
              console.log('Refreshing token balance...');
              const tokenResult = await refetchTokenBalance();
              console.log('Token balance refresh result:', tokenResult);
              result.balances.token = tokenResult;
            } catch (tokenError) {
              console.error('Error refreshing token balance:', tokenError);
              result.tokenError = tokenError.message;
            }
          }

          // Only fetch agent balance if we're connected and have an address
          if (isConnected && targetAddress && (walletType === 'both' || walletType === 'smart' || walletType === 'agent')) {
            // Update the last fetch time
            lastFetchTimeRef.current = now;

            // Attempt to fetch agent balance
            try {
              console.log('Refreshing agent balance...');
              const agentResult = await fetchAgentBalance();
              console.log('Agent balance refresh result:', agentResult);
              result.balances.agent = agentResult;

              // If we got a valid agent balance, update the native balance display as well
              if (agentResult && agentResult.balance) {
                const parsedBalance = parseFloat(agentResult.balance);
                if (!isNaN(parsedBalance)) {
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
              result.agentError = agentError.message;
            }
          }

          console.log('Balance refresh sequence completed');
          resolve(result);
        } catch (error) {
          console.error('Error in balance refresh sequence:', error);
          reject(error);
        } finally {
          // Reset the refreshing state
          setIsRefreshing(false);
        }
      };

      // Start the fetch sequence
      fetchSequence().catch(error => {
        console.error('Error in fetchSequence:', error);
        setIsRefreshing(false);
        reject(error);
      });

      // Set a backup timeout to ensure we exit the refreshing state
      refreshTimeoutRef.current = setTimeout(() => {
        setIsRefreshing(false);
        resolve({ status: 'timeout', message: 'Balance refresh timed out' });
      }, 10000);
    });
  }, [isRefreshing, refetchNativeBalance, refetchTokenBalance, tokenAddress, fetchAgentBalance, isConnected, targetAddress, lastFetchTimeRef, setFormattedNativeBalance, balances, agentBalances, hasFetchedRef]);

  // Determine the best balance to display
  // Priority: 1. Native balance from wagmi, 2. Agent balance, 3. Default 0 ETH
  const displayBalance = () => {
    if (nativeBalance && formattedNativeBalance && formattedNativeBalance !== '0') {
      return `${formattedNativeBalance} ${nativeBalance.symbol || 'ETH'}`;
    } else if (agentBalances.ETH && agentBalances.ETH !== '0') {
      return `${agentBalances.ETH} ETH`;
    } else {
      return '0 ETH';
    }
  };

  return {
    // Native balance (ETH)
    nativeBalance: nativeBalance?.value,
    formattedNativeBalance,
    nativeSymbol: nativeBalance?.symbol || 'ETH',
    nativeDisplayBalance: displayBalance(),
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
