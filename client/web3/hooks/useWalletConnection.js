"use client"

import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { injected, metaMask, walletConnect, coinbaseWallet } from 'wagmi/connectors'
import { useEffect, useState } from 'react'

/**
 * Custom hook for wallet connection functionality
 * Provides methods to connect and disconnect wallets, as well as connection status
 */
export function useWalletConnection() {
  const [isMounted, setIsMounted] = useState(false)
  const { address, isConnected, status } = useAccount()
  const { connect, isPending, error } = useConnect()
  const { disconnect } = useDisconnect()

  // Set mounted state after component mounts to prevent hydration errors
  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Function to connect with Injected provider (browser wallet)
  const connectInjected = () => {
    connect({ connector: injected() })
  }

  // Function to connect with MetaMask
  const connectMetaMask = () => {
    connect({ connector: metaMask() })
  }

  // Function to connect with WalletConnect
  const connectWalletConnect = () => {
    const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '9f9310517adea17021a541eca3140522'
    connect({ connector: walletConnect({
      projectId
    }) })
  }

  // Function to connect with Coinbase Wallet
  const connectCoinbaseWallet = () => {
    connect({ connector: coinbaseWallet({
      appName: 'Lucra AI',
    }) })
  }

  // Only allow connections after component is mounted
  const safeConnect = (fn) => {
    if (!isMounted) return
    fn()
  }

  return {
    address,
    isConnected: isMounted && isConnected,
    status,
    isPending,
    error,
    connectInjected: () => safeConnect(connectInjected),
    connectMetaMask: () => safeConnect(connectMetaMask),
    connectWalletConnect: () => safeConnect(connectWalletConnect),
    connectCoinbaseWallet: () => safeConnect(connectCoinbaseWallet),
    disconnect: () => isMounted && disconnect()
  }
}
