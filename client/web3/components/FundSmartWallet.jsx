"use client"

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { useTransactions } from '../hooks/useTransactions'
import { useWalletBalance } from '../hooks/useWalletBalance'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { motion } from 'framer-motion'
import { ArrowUpDown, AlertCircle, CheckCircle } from 'lucide-react'
import { formatAddressOrName } from '../../../web3'

/**
 * FundSmartWallet component that allows users to fund their smart wallet
 * from their regular wallet
 */
export function FundSmartWallet({ smartWalletAddress, onSuccess, onCancel }) {
  const { address, isConnected } = useAccount()
  const { sendPayment } = useTransactions()
  const { nativeDisplayBalance, isNativeBalanceLoading } = useWalletBalance()
  
  const [amount, setAmount] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  
  // Handle amount change
  const handleAmountChange = (e) => {
    // Only allow numbers and decimals
    const value = e.target.value.replace(/[^0-9.]/g, '')
    setAmount(value)
  }
  
  // Handle funding the smart wallet
  const handleFundWallet = async () => {
    if (!isConnected || !address || !smartWalletAddress) {
      setError('Wallet not connected')
      return
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount')
      return
    }
    
    try {
      setIsSubmitting(true)
      setError(null)
      
      // Send payment to the smart wallet
      const result = await sendPayment({
        to: smartWalletAddress,
        amount: amount,
        token: 'ETH'
      })
      
      if (result?.success) {
        setSuccess(true)
        setTimeout(() => {
          if (onSuccess) onSuccess(result)
        }, 2000)
      } else {
        throw new Error(result?.error || 'Failed to fund smart wallet')
      }
    } catch (err) {
      console.error('Error funding smart wallet:', err)
      setError(err.message || 'Failed to fund smart wallet')
    } finally {
      setIsSubmitting(false)
    }
  }
  
  // Handle canceling the funding
  const handleCancel = () => {
    if (onCancel) onCancel()
  }
  
  return (
    <div className="p-4 bg-white/5 rounded-xl border border-white/10">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-white mb-2">Fund Smart Wallet</h3>
        <p className="text-sm text-white/60">
          Transfer ETH from your main wallet to your smart wallet.
        </p>
      </div>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="text-sm text-white/60">From</div>
          <div className="text-sm text-white">{formatAddressOrName(address)}</div>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="text-sm text-white/60">To</div>
          <div className="text-sm text-white">{formatAddressOrName(smartWalletAddress)}</div>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="text-sm text-white/60">Available</div>
          <div className="text-sm text-white">
            {isNativeBalanceLoading ? 'Loading...' : nativeDisplayBalance || '0 ETH'}
          </div>
        </div>
        
        <div className="space-y-2">
          <label htmlFor="amount" className="text-sm text-white/60">
            Amount (ETH)
          </label>
          <div className="relative">
            <Input
              id="amount"
              type="text"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0.01"
              className="bg-white/5 border-white/10 text-white"
              disabled={isSubmitting || success}
            />
            {amount && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-purple-400 hover:text-purple-300 p-1 h-6"
                onClick={() => setAmount(nativeDisplayBalance?.split(' ')[0] || '')}
                disabled={isSubmitting || success}
              >
                MAX
              </Button>
            )}
          </div>
        </div>
        
        {error && (
          <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <p className="text-green-400 text-sm">Smart wallet funded successfully!</p>
          </div>
        )}
        
        <div className="flex justify-end gap-2 mt-4">
          <Button
            variant="ghost"
            className="text-white/60 hover:text-white hover:bg-white/10"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          
          <motion.div whileHover={{ scale: 1.05 }}>
            <Button
              onClick={handleFundWallet}
              className="bg-purple-500 hover:bg-purple-600 text-white gap-1"
              disabled={isSubmitting || !amount || success}
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                <>
                  Fund Wallet
                  <ArrowUpDown className="h-4 w-4" />
                </>
              )}
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
