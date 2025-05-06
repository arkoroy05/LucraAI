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
  const connectInjected = async () => {
    try {
      // Add a timeout to prevent hanging connections
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timed out. Please try again.')), 30000)
      );

      const connectionPromise = connect({ connector: injected() });

      // Race the connection against the timeout
      await Promise.race([connectionPromise, timeoutPromise]);
    } catch (error) {
      console.error('Injected wallet connection error:', error);
      throw error; // Re-throw to allow the component to handle it
    }
  }

  // Function to connect with MetaMask
  const connectMetaMask = async () => {
    try {
      // Add a timeout to prevent hanging connections
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timed out. Please try again.')), 30000)
      );

      const connectionPromise = connect({ connector: metaMask() });

      // Race the connection against the timeout
      await Promise.race([connectionPromise, timeoutPromise]);
    } catch (error) {
      console.error('MetaMask connection error:', error);
      throw error; // Re-throw to allow the component to handle it
    }
  }

  // Function to connect with WalletConnect
  const connectWalletConnect = async () => {
    try {
      const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || '9f9310517adea17021a541eca3140522'

      // Add a timeout to prevent hanging connections
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timed out. Please try again.')), 60000)
      );

      // Use the connector from the config instead of creating a new one
      const connectionPromise = connect({
        connector: walletConnect()
      });

      // Race the connection against the timeout
      await Promise.race([connectionPromise, timeoutPromise]);
    } catch (error) {
      console.error('WalletConnect connection error:', error);
      throw error; // Re-throw to allow the component to handle it
    }
  }

  // Function to connect with Coinbase Wallet
  const connectCoinbaseWallet = async () => {
    try {
      // Add a timeout to prevent hanging connections
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timed out. Please try again.')), 30000)
      );

      const connectionPromise = connect({
        connector: coinbaseWallet({
          appName: 'Lucra AI',
          headlessMode: true,
          reloadOnDisconnect: false,
        })
      });

      // Race the connection against the timeout
      await Promise.race([connectionPromise, timeoutPromise]);
    } catch (error) {
      console.error('Coinbase Wallet connection error:', error);
      throw error; // Re-throw to allow the component to handle it
    }
  }

  // Only allow connections after component is mounted
  const safeConnect = async (fn) => {
    if (!isMounted) return
    try {
      await fn()
    } catch (error) {
      console.error('Connection error:', error)
    }
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
