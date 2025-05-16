"use client"

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { useSmartWallet } from '../hooks/useSmartWallet'
import { useSmartWalletMapping } from '../hooks/useSmartWalletMapping'
import { useWalletBalance } from '../hooks/useWalletBalance'
import { useBaseName } from '../hooks/useBaseName'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { Wallet, Plus, Trash2, ExternalLink, RefreshCw, ArrowUpDown, Tag } from 'lucide-react'
import { formatAddressOrName } from '../utils/baseNameService'
import { getExplorerUrl } from '../config/networks'
import { FundSmartWallet } from './FundSmartWallet'

// We'll use the actual Base Name Service for resolution instead of hardcoded mappings

/**
 * SmartWalletUI component that provides UI for creating and managing Smart Wallets
 */
export function SmartWalletUI() {
  const { address } = useAccount()

  const {
    smartWallet,
    isLoading: isSmartWalletLoading,
    error: smartWalletError,
    network
  } = useSmartWallet()

  const {
    mappedWallets,
    isLoading: isMappingLoading,
    error: mappingError,
    createAndMapSmartWallet,
    removeSmartWalletMapping,
    loadMappedWallets
  } = useSmartWalletMapping()

  const [selectedWallet, setSelectedWallet] = useState(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isFunding, setIsFunding] = useState(false)
  const [showFundingUI, setShowFundingUI] = useState(false)
  const [walletBaseName, setWalletBaseName] = useState(null)

  // Pass the selected smart wallet address to the wallet balance hook
  const {
    agentBalances,
    fetchAgentBalance,
    isAgentLoading
  } = useWalletBalance(null, selectedWallet?.address)

  const {
    lookupAddress,
    baseName,
    lookupSmartWalletName
  } = useBaseName()

  // Set the selected wallet to the first mapped wallet if available
  useEffect(() => {
    if (mappedWallets?.length > 0 && !selectedWallet) {
      setSelectedWallet(mappedWallets[0])
    }
  }, [mappedWallets, selectedWallet])

  // Reset the walletBaseName when the selected wallet changes
  useEffect(() => {
    setWalletBaseName(null)
  }, [selectedWallet?.address])

  // Look up the Base Name for the selected wallet
  useEffect(() => {
    // Skip if no wallet is selected
    if (!selectedWallet?.address) {
      setWalletBaseName(null);
      return;
    }

    // Skip if we already have a basename
    if (walletBaseName) {
      return;
    }

    // Use the smart wallet lookup function which has built-in caching
    lookupSmartWalletName(selectedWallet.address)
      .then(smartWalletName => {
        if (smartWalletName) {
          setWalletBaseName(smartWalletName);
        } else {
          setWalletBaseName(null);
        }
      })
      .catch(err => {
        console.error('Error looking up Base Name for smart wallet:', err);
        setWalletBaseName(null);
      });
  }, [selectedWallet, lookupSmartWalletName, walletBaseName]);

  // Handle creating a new Smart Wallet
  const handleCreateWallet = async () => {
    try {
      setIsCreating(true)
      console.log('Creating new Smart Wallet...')

      // First ensure the user exists in the database
      try {
        if (!address) {
          console.warn('No wallet address available, skipping user record check');
        } else {
          const response = await fetch('/api/users/ensure', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              walletAddress: address,
              walletType: 'wagmi'
            })
          });

          if (!response.ok) {
            console.warn('Failed to ensure user exists, but continuing anyway');
          } else {
            console.log('User record ensured in database');
          }
        }
      } catch (userError) {
        console.warn('Error ensuring user exists, but continuing anyway:', userError);
      }

      // If we already have mapped wallets, force creation of a new one
      const options = mappedWallets.length > 0 ? { force: true } : {}

      const wallet = await createAndMapSmartWallet(options)

      if (wallet) {
        console.log('Smart Wallet created and mapped successfully:', wallet?.address)
        setSelectedWallet(wallet)

        // Refresh the wallet list to ensure we have the latest data
        await loadMappedWallets()
      } else {
        console.warn('Failed to create or map smart wallet')
      }
    } catch (error) {
      console.error('Error creating Smart Wallet:', error)
    } finally {
      setIsCreating(false)
    }
  }

  // Handle removing a Smart Wallet
  const handleRemoveWallet = async (walletAddress) => {
    try {
      console.log('Removing Smart Wallet:', walletAddress)
      await removeSmartWalletMapping(walletAddress)
      console.log('Smart Wallet removed successfully')

      // If the removed wallet was selected, select another one
      if (selectedWallet?.address === walletAddress) {
        const remainingWallets = mappedWallets.filter(w => w.address !== walletAddress)
        setSelectedWallet(remainingWallets.length > 0 ? remainingWallets[0] : null)
      }
    } catch (error) {
      console.error('Error removing Smart Wallet:', error)
    }
  }

  // Handle refreshing the wallet list
  const handleRefreshWallets = async () => {
    try {
      await loadMappedWallets()
      await fetchAgentBalance()
    } catch (error) {
      console.error('Error refreshing wallets:', error)
    }
  }

  // Handle showing the funding UI
  const handleShowFundingUI = (walletAddress) => {
    setShowFundingUI(true)
  }

  // Handle funding success
  const handleFundingSuccess = (result) => {
    console.log('Smart Wallet funded successfully:', result)
    setShowFundingUI(false)
    // Refresh balances after funding
    setTimeout(() => {
      fetchAgentBalance()
    }, 2000)
  }

  // Handle funding cancel
  const handleFundingCancel = () => {
    setShowFundingUI(false)
  }

  // Get the explorer URL for a wallet address
  const getWalletExplorerUrl = (address) => {
    if (!address) return null

    const baseUrl = network.name.toLowerCase().includes('sepolia')
      ? 'https://sepolia.basescan.org/address/'
      : 'https://basescan.org/address/'

    return `${baseUrl}${address}`
  }

  // Combine errors
  const error = smartWalletError || mappingError

  // Determine if loading
  const isLoading = isSmartWalletLoading || isMappingLoading

  return (
    <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10 smart-wallet-ui">
      <div className="flex justify-between items-center mb-4">
        <span className="text-white/60 flex items-center gap-1">
          <Wallet className="h-4 w-4" />
          Smart Wallet
        </span>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="text-white/60 hover:text-white p-1 h-7"
            onClick={handleRefreshWallets}
            disabled={isLoading || isAgentLoading}
            title="Refresh wallets"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          {mappedWallets?.length > 0 ? (
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-500/20 text-green-400">
              {mappedWallets.length} Wallet{mappedWallets.length !== 1 ? 's' : ''}
            </span>
          ) : (
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-purple-400/10 text-purple-400">
              Not Created
            </span>
          )}
        </div>
      </div>

      {mappedWallets?.length > 0 ? (
        <div className="space-y-4">
          {/* Selected wallet details */}
          {selectedWallet && (
            <div className="p-3 bg-white/5 rounded-lg border border-white/10">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white font-medium flex items-center gap-1">
                  {walletBaseName ? (
                    <>
                      <Tag className="h-3 w-3 text-purple-400" />
                      <span>{walletBaseName}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-white/80">{formatAddressOrName(selectedWallet.address)}</span>
                      <span className="text-xs text-white/40 ml-1">(No basename)</span>
                    </>
                  )}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-purple-400 hover:text-purple-300 gap-1 p-1 h-7"
                    onClick={() => window.open(getWalletExplorerUrl(selectedWallet.address), '_blank')}
                    title="View on explorer"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-400 hover:text-red-300 gap-1 p-1 h-7"
                    onClick={() => handleRemoveWallet(selectedWallet.address)}
                    title="Remove wallet"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="text-xs text-white/60 mb-1">
                Network: {selectedWallet.network_id
                  ? selectedWallet.network_id.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())
                  : network?.name || 'Unknown'}
              </div>
              <div className="text-xs text-white/60 mb-3">
                Created: {selectedWallet.created_at
                  ? new Date(selectedWallet.created_at).toLocaleString()
                  : 'Unknown'}
              </div>

              {/* Balance and fund button */}
              <div className="flex justify-between items-center">
                <div className="text-sm text-white">
                  <span className="text-white/60 mr-1">Balance:</span>
                  {isAgentLoading ? (
                    <span className="text-white/40">Loading...</span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-medium text-purple-400">
                        {agentBalances?.ETH
                            ? `${parseFloat(agentBalances.ETH).toFixed(1)} ETH`
                            : '0.0 ETH'}
                      </span>
                      <button
                    size="sm"
                    onClick={() => handleShowFundingUI(selectedWallet.address)}
                    className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 gap-1"
                    disabled={isFunding}
                  >
                    Fund
                    <ArrowUpDown className="h-3 w-3" />
                  </button>
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Wallet list if more than one */}
          {mappedWallets.length > 1 && (
            <div className="mt-2">
              <h4 className="text-xs font-medium text-white/60 mb-2">Your Wallets</h4>
              <div className="space-y-1">
                {mappedWallets.map((wallet) => {
                  return (
                  <div
                    key={wallet.address}
                    className={`p-2 rounded-md cursor-pointer flex justify-between items-center ${
                      selectedWallet?.address === wallet.address
                        ? 'bg-purple-500/20 border border-purple-500/30'
                        : 'hover:bg-white/5'
                    }`}
                    onClick={() => setSelectedWallet(wallet)}
                  >
                      <span className="text-sm text-white flex items-center gap-1">
                        {formatAddressOrName(wallet.address)}
                      </span>
                    <span className="text-xs text-white/60">
                        {wallet.network_id
                          ? (wallet.network_id.includes('sepolia') ? 'Testnet' : 'Mainnet')
                          : (network?.name?.toLowerCase().includes('sepolia') ? 'Testnet' : 'Mainnet')}
                    </span>
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Create another wallet button */}
          <div className="mt-2 flex justify-end">
            <motion.div whileHover={{ scale: 1.05 }}>
              <Button
                size="sm"
                onClick={handleCreateWallet}
                className="bg-white/5 hover:bg-white/10 text-white gap-1"
                disabled={isCreating || isLoading}
              >
                {isCreating ? 'Creating...' : 'Create Another'}
                <Plus className="h-3 w-3" />
              </Button>
            </motion.div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          <motion.div whileHover={{ scale: 1.02 }} className="self-center">
            <Button
              onClick={handleCreateWallet}
              className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 gap-1"
              disabled={isCreating || isLoading}
            >
              {isCreating ? 'Creating Smart Wallet...' : 'Create Smart Wallet'}
              <Plus className="h-4 w-4" />
            </Button>
          </motion.div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Funding UI Modal */}
      {showFundingUI && selectedWallet && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="max-w-md w-full mx-auto my-auto"
          >
            <FundSmartWallet
              smartWalletAddress={selectedWallet.address}
              onSuccess={handleFundingSuccess}
              onCancel={handleFundingCancel}
            />
          </motion.div>
        </div>
      )}
    </div>
  )
}
