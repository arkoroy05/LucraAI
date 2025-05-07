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

      // Create the connector instance
      const injectedConnector = injected();

      // Connect with the connector
      const connectionPromise = connect({
        connector: injectedConnector
      });

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

      // Create the connector instance
      const metaMaskConnector = metaMask();

      // Connect with the connector
      const connectionPromise = connect({
        connector: metaMaskConnector
      });

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

      // Create the connector instance with the project ID
      const walletConnectConnector = walletConnect({
        projectId,
        showQrModal: true,
        qrModalOptions: {
          themeMode: 'dark',
        },
        metadata: {
          name: 'Lucra AI',
          description: 'Your AI-powered crypto assistant',
          url: 'https://lucra.ai',
          icons: ['https://avatars.githubusercontent.com/u/37784886'],
        },
      });

      // Connect with the connector
      const connectionPromise = connect({
        connector: walletConnectConnector
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

      // Create the connector instance
      const coinbaseWalletConnector = coinbaseWallet({
        appName: 'Lucra AI',
        headlessMode: false,
        reloadOnDisconnect: false,
        darkMode: true,
      });

      // Connect with the connector
      const connectionPromise = connect({
        connector: coinbaseWalletConnector
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
      // Re-throw the error so it can be caught by the ConnectWallet component
      throw error
    }
  }

  // Debug function to log connection status
  useEffect(() => {
    if (isMounted) {
      console.log('Wallet connection status:', {
        isConnected,
        address,
        status,
        isPending,
        error: error ? error.message : null
      })
    }
  }, [isMounted, isConnected, address, status, isPending, error])

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
