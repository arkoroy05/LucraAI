"use client"

import { useAccount } from 'wagmi'
import { Card } from '@/components/ui/card'
import { motion } from 'framer-motion'
import { Wallet } from 'lucide-react'
import { useWalletBalance } from '../hooks/useWalletBalance'
import { formatAddress } from '../utils/balanceUtils'

/**
 * AccountInfo component that displays the connected wallet's information
 * including address and balance
 */
export function AccountInfo() {
  const { address, isConnected } = useAccount()
  const {
    nativeDisplayBalance,
    isNativeBalanceLoading,
    refreshBalances
  } = useWalletBalance()

  if (!isConnected || !address) {
    return null
  }

  return (
    <motion.div whileHover={{ scale: 1.02 }}>
      <Card className="p-4 bg-white/5 hover:bg-white/10 transition-colors border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
              className="p-2 rounded-lg bg-purple-500/20"
            >
              <Wallet className="h-4 w-4 text-purple-400" />
            </motion.div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-white">
                Wallet
              </span>
              <span className="text-xs text-white/60">
                {address ? formatAddress(address) : ''}
              </span>
            </div>
          </div>
          <div
            className="text-sm font-medium text-purple-400 cursor-pointer"
            onClick={refreshBalances}
            title="Click to refresh balance"
          >
            {isNativeBalanceLoading ? (
              <span className="animate-pulse">Loading...</span>
            ) : (
              nativeDisplayBalance
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  )
}
