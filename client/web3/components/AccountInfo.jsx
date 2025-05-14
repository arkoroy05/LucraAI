"use client"

import { useAccount } from 'wagmi'
import { Card } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { Wallet, RefreshCw } from 'lucide-react'
import { useWalletBalance } from '../hooks/useWalletBalance'
import { formatAddress } from '../utils/balanceUtils'
import { useEffect, useState } from 'react'

/**
 * AccountInfo component that displays the connected wallet's information
 * including address and balance
 */
export function AccountInfo() {
  const { address, isConnected } = useAccount()
  const {
    nativeDisplayBalance,
    isNativeBalanceLoading,
    refreshBalances,
    agentBalances
  } = useWalletBalance()

  const [isRefreshing, setIsRefreshing] = useState(false)
  const [displayBalance, setDisplayBalance] = useState('0 ETH')

  // Handle balance refresh with timeout to prevent UI getting stuck
  const handleRefreshBalance = () => {
    setIsRefreshing(true)
    refreshBalances()

    // Set a timeout to ensure we don't get stuck in loading state
    setTimeout(() => {
      setIsRefreshing(false)
    }, 3000)
  }

  // Update display balance when native balance or agent balances change
  useEffect(() => {
    // Set a timeout to ensure we don't get stuck in loading state
    const timer = setTimeout(() => {
      if (isNativeBalanceLoading && isRefreshing) {
        setIsRefreshing(false);
      }
    }, 3000);

    if (nativeDisplayBalance && nativeDisplayBalance !== '0 ETH') {
      setDisplayBalance(nativeDisplayBalance);
    } else if (agentBalances && agentBalances.ETH) {
      setDisplayBalance(`${agentBalances.ETH} ETH`);
    } else {
      // Fallback to a default value if both are empty
      setDisplayBalance('0.0000 ETH');
    }

    return () => clearTimeout(timer);
  }, [nativeDisplayBalance, agentBalances, isNativeBalanceLoading, isRefreshing])

  if (!isConnected || !address) {
    return null
  }

  return (
    <Card className="p-4 bg-white/5 hover:bg-white/10 transition-colors border-white/10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <Wallet className="h-4 w-4 text-purple-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white">
              Wallet
            </span>
            <span className="text-xs text-white/60 truncate max-w-[100px]">
              {address ? formatAddress(address) : ''}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="text-sm font-medium text-purple-400"
          >
            {isNativeBalanceLoading || isRefreshing ? (
              <span className="animate-pulse">Loading...</span>
            ) : (
              displayBalance
            )}
          </div>
          <button
            onClick={handleRefreshBalance}
            className="text-purple-400 hover:text-purple-300 transition-colors"
            disabled={isRefreshing}
            title="Refresh balance"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    </Card>
  )
}
