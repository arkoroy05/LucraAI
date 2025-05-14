"use client"

import { useState } from 'react'
import { useSmartWallet } from '../hooks/useSmartWallet'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { Wallet, Plus, Trash2, ExternalLink } from 'lucide-react'
import { formatAddressOrName } from '../../../web3'

/**
 * SmartWalletUI component that provides UI for creating and managing Smart Wallets
 */
export function SmartWalletUI() {
  const {
    smartWallet,
    isLoading,
    error,
    createWallet,
    clearWallet,
    hasWallet,
    network
  } = useSmartWallet()
  const [isCreating, setIsCreating] = useState(false)

  // Handle creating a new Smart Wallet
  const handleCreateWallet = async () => {
    try {
      setIsCreating(true)
      await createWallet()
    } catch (error) {
      console.error('Error creating Smart Wallet:', error)
    } finally {
      setIsCreating(false)
    }
  }

  // Handle clearing the Smart Wallet
  const handleClearWallet = () => {
    clearWallet()
  }

  // Get the explorer URL for the Smart Wallet
  const getExplorerUrl = () => {
    if (!smartWallet) return null

    const baseUrl = network.name.toLowerCase().includes('sepolia')
      ? 'https://sepolia.basescan.org/address/'
      : 'https://basescan.org/address/'

    return `${baseUrl}${smartWallet.address}`
  }

  return (
    <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10 smart-wallet-ui">
      <div className="flex justify-between items-center mb-2">
        <span className="text-white/60 flex items-center gap-1">
          <Wallet className="h-4 w-4" />
          Smart Wallet
        </span>
        {smartWallet ? (
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-500/20 text-green-400">
            Active
          </span>
        ) : (
          <span className="text-xs font-medium px-2 py-1 rounded-full bg-purple-400/10 text-purple-400">
            Not Created
          </span>
        )}
      </div>

      {smartWallet ? (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-white font-medium">
              {formatAddressOrName(smartWallet.address)}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="text-purple-400 hover:text-purple-300 gap-1"
                onClick={() => window.open(getExplorerUrl(), '_blank')}
              >
                View
                <ExternalLink className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-red-400 hover:text-red-300 gap-1"
                onClick={handleClearWallet}
              >
                Remove
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="text-xs text-white/60">
            Network: {network.name}
          </div>
          <div className="text-xs text-white/60">
            Created: {new Date(smartWallet.createdAt).toLocaleString()}
          </div>
        </div>
      ) : (
        <div className="flex justify-between items-center">
          <span className="text-white/60">
            Create a Smart Wallet to use advanced features
          </span>
          <motion.div whileHover={{ scale: 1.05 }}>
            <Button
              size="sm"
              onClick={handleCreateWallet}
              className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 gap-1"
              disabled={isCreating || isLoading}
            >
              {isCreating ? 'Creating...' : 'Create'}
              <Plus className="h-3 w-3" />
            </Button>
          </motion.div>
        </div>
      )}

      {error && (
        <div className="mt-2 text-xs text-red-400">
          {error}
        </div>
      )}
    </div>
  )
}
