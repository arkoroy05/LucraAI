"use client"

import { useState, useEffect } from 'react'
import { useWalletConnection } from '../hooks/useWalletConnection'
import { useWalletSigning } from '../hooks/useWalletSigning'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { Wallet, X, CheckCircle, AlertCircle } from 'lucide-react'

/**
 * ConnectWallet component that provides a button to connect wallet
 * and displays a modal with wallet options when clicked
 */
export function ConnectWallet({ onModalToggle }) { // Accept onModalToggle prop
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [connectionError, setConnectionError] = useState(null)
  const [showSigningPrompt, setShowSigningPrompt] = useState(false)
  const {
    isConnected,
    address,
    isPending,
    error,
    connectInjected,
    connectMetaMask,
    connectWalletConnect,
    connectCoinbaseWallet,
    disconnect
  } = useWalletConnection()

  const {
    verifyWalletOwnership,
    checkWalletVerification,
    isVerifying,
    isVerified,
    verificationError
  } = useWalletSigning()

  // Set mounted state after component mounts to prevent hydration errors
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Format address for display (0x1234...5678)
  const formatAddress = (address) => {
    if (!address) return ''
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // Toggle the wallet connection modal
  const toggleModal = () => {
    const newModalState = !isModalOpen;
    setIsModalOpen(newModalState);
    if (onModalToggle) {
      onModalToggle(newModalState); // Call the callback
    }
  }

  // Connect with the selected wallet and close the modal
  const connectWallet = async (connectFunction) => {
    try {
      setConnectionError(null)
      await connectFunction()
      // Only close modal on successful connection
      if (isConnected) {
        // setIsModalOpen(false) // Managed by useEffect below
      }
    } catch (error) {
      console.error('Error connecting wallet:', error)
      // Provide more specific error messages based on the error
      if (error.message?.includes('User rejected')) {
        setConnectionError('Connection rejected. Please approve the connection request.')
      } else if (error.message?.includes('timed out')) {
        setConnectionError('Connection timed out. Please try again.')
      } else if (error.message?.includes('already processing')) {
        setConnectionError('A connection request is already in progress. Please check your wallet.')
      } else {
        setConnectionError(error.message || 'Connection failed. Please try again.')
      }
      // Keep modal open if there's an error
    }
  }

  // Update connection error when wagmi error changes
  useEffect(() => {
    if (error) {
      // Provide more specific error messages based on the error
      if (error.message?.includes('User rejected')) {
        setConnectionError('Connection rejected. Please approve the connection request.')
      } else if (error.message?.includes('timed out')) {
        setConnectionError('Connection timed out. Please try again.')
      } else if (error.message?.includes('already processing')) {
        setConnectionError('A connection request is already in progress. Please check your wallet.')
      } else {
        setConnectionError(error.message || 'Connection failed. Please try again.')
      }
    }
  }, [error])

  // Close modal when connection is successful
  useEffect(() => {
    if (isConnected && isModalOpen) {
      setIsModalOpen(false);
      if (onModalToggle) {
        onModalToggle(false); // Update parent state
      }

      // Check if the wallet is already verified
      if (address) {
        checkWalletVerification(address)
          .then(verified => {
            if (!verified) {
              // If not verified, show the signing prompt
              setShowSigningPrompt(true);
              if (onModalToggle) {
                onModalToggle(true); // Verification modal is also a modal
              }
            }
          })
          .catch(err => console.error('Error checking wallet verification:', err))
      }
    }
  }, [isConnected, isModalOpen, address, checkWalletVerification, onModalToggle])

  // Handle wallet verification
  const handleVerifyWallet = async () => {
    if (!address) return

    try {
      const success = await verifyWalletOwnership(address)
      if (success) {
        setShowSigningPrompt(false);
        if (onModalToggle) {
          onModalToggle(false); // Close verification modal
        }
      }
    } catch (error) {
      console.error('Error verifying wallet:', error)
    }
  }

  // Don't render anything during SSR to prevent hydration errors
  if (!isMounted) {
    return (
      <Button
        className="bg-white/10 hover:bg-white/20 text-white border border-white/20 text-sm font-medium"
      >
        Connect Wallet
      </Button>
    )
  }

  return (
    <>
      <motion.div whileHover={{ scale: 1.05 }}>
        <Button
          onClick={isConnected ? disconnect : toggleModal}
          className={`bg-white/10 hover:bg-white/20 text-white border border-white/20 text-sm font-medium ${isPending || isVerifying ? 'opacity-50' : ''}`}
          disabled={isPending || isVerifying}
        >
          {isPending ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Connecting...
            </span>
          ) : isVerifying ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Verifying...
            </span>
          ) : isConnected ? (
            <span className="flex items-center">
              {isVerified && <CheckCircle className="h-3 w-3 mr-1 text-green-400" />}
              {formatAddress(address)}
            </span>
          ) : (
            'Connect Wallet'
          )}
        </Button>
      </motion.div>

      {/* Wallet Connection Modal - Positioned at the top */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[999999] flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm" 
             style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'auto', zIndex: 999999 }}>
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="bg-[#0B0118] border border-white/10 rounded-xl p-6 max-w-md w-full mx-4 relative"
            style={{ 
              maxHeight: '80vh', 
              overflowY: 'auto', 
              position: 'relative', 
              pointerEvents: 'auto',
              zIndex: 999999,
              isolation: 'isolate'
            }}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-medium text-white">Connect Wallet</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleModal}
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="grid gap-3">
              <motion.div whileHover={{ scale: 1.02 }}>
                <Button
                  onClick={() => connectWallet(connectMetaMask)}
                  className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 py-4 justify-start"
                  disabled={isPending}
                >
                  <img src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" alt="MetaMask" className="h-5 w-5 mr-3" />
                  <span>{isPending ? 'Connecting...' : 'MetaMask'}</span>
                </Button>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }}>
                <Button
                  onClick={() => connectWallet(connectCoinbaseWallet)}
                  className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 py-4 justify-start"
                  disabled={isPending}
                >
                  <img src="https://www.coinbase.com/assets/favicon/favicon-256.png" alt="Coinbase Wallet" className="h-5 w-5 mr-3" />
                  <span>{isPending ? 'Connecting...' : 'Coinbase Wallet'}</span>
                </Button>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }}>
                <Button
                  onClick={() => connectWallet(connectWalletConnect)}
                  className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 py-4 justify-start"
                  disabled={isPending}
                >
                  <img src="https://avatars.githubusercontent.com/u/37784886" alt="WalletConnect" className="h-5 w-5 mr-3" />
                  <span>{isPending ? 'Connecting...' : 'WalletConnect'}</span>
                </Button>
              </motion.div>

              <motion.div whileHover={{ scale: 1.02 }}>
                <Button
                  onClick={() => connectWallet(connectInjected)}
                  className="w-full bg-white/5 hover:bg-white/10 text-white border border-white/10 py-4 justify-start"
                  disabled={isPending}
                >
                  <Wallet className="h-5 w-5 mr-3 text-purple-400" />
                  <span>{isPending ? 'Connecting...' : 'Browser Wallet'}</span>
                </Button>
              </motion.div>
            </div>

            {connectionError && (
              <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm text-center">{connectionError}</p>
              </div>
            )}

            <p className="text-white/40 text-xs mt-6 text-center">
              By connecting your wallet, you agree to our Terms of Service and Privacy Policy
            </p>
          </motion.div>
        </div>
      )}

      {/* Wallet Verification Modal - Also positioned at the top */}
      {showSigningPrompt && (
        <div className="fixed inset-0 z-[999999] flex items-start justify-center pt-20 bg-black/50 backdrop-blur-sm" 
             style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'auto', zIndex: 999999 }}>
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="bg-[#0B0118] border border-white/10 rounded-xl p-6 max-w-md w-full mx-4 relative"
            style={{ 
              maxHeight: '80vh', 
              overflowY: 'auto', 
              position: 'relative', 
              pointerEvents: 'auto',
              zIndex: 999999,
              isolation: 'isolate'
            }}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-medium text-white">Verify Wallet Ownership</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={closeVerificationModal} // Use the new handler
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="mb-6">
              <p className="text-white/80 mb-4">
                Please sign a message to verify your wallet ownership. This helps secure your account and enables transactions.
              </p>
              <p className="text-white/60 text-sm mb-6">
                This signature will not trigger a blockchain transaction or cost any gas fees.
              </p>

              <motion.div whileHover={{ scale: 1.02 }}>
                <Button
                  onClick={handleVerifyWallet}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-4"
                  disabled={isVerifying}
                >
                  {isVerifying ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Verifying...
                    </span>
                  ) : (
                    'Sign Message'
                  )}
                </Button>
              </motion.div>

              <Button
                variant="ghost"
                className="w-full mt-3 text-white/60 hover:text-white hover:bg-white/10"
                onClick={closeVerificationModal} // Use the new handler
              >
                Skip for Now
              </Button>
            </div>

            {verificationError && (
              <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm text-center">{verificationError}</p>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </>
  )
}
