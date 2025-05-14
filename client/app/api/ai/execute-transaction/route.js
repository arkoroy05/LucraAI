import { NextResponse } from 'next/server';
import { createTransactionAgent } from '../../../../../web3/utils/agentKit';
import { resolveBaseName } from '../../../../../web3/utils/baseName';
import { parseEther } from 'viem';

/**
 * Execute a transaction that was previously processed
 * @param {Request} req - The request object
 * @returns {Promise<Response>} - The response object
 */
export async function POST(req) {
  try {
    // Parse the request body
    const body = await req.json();
    const { transaction, walletAddress, useTestnet = false } = body;

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction details are required' },
        { status: 400 }
      );
    }

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Create an agent for handling the transaction
    const agent = createTransactionAgent({ useTestnet, walletAddress });

    // Execute the transaction based on its type
    if (transaction.type === 'send') {
      // Resolve the recipient address if it's a Base Name
      const resolvedRecipient = await resolveBaseName(transaction.recipient, useTestnet);
      
      if (!resolvedRecipient) {
        return NextResponse.json(
          { error: `Could not resolve recipient address: ${transaction.recipient}` },
          { status: 400 }
        );
      }

      // Use the agent's sendTransaction capability
      const result = await agent.capabilities.sendTransaction.handler({
        to: resolvedRecipient,
        amount: transaction.amount,
        token: transaction.token || 'ETH',
      });

      return NextResponse.json({
        success: true,
        transactionHash: result.hash || 'mock-tx-hash-' + Date.now(),
        details: {
          type: 'send',
          from: walletAddress,
          to: resolvedRecipient,
          amount: transaction.amount,
          token: transaction.token || 'ETH',
          network: useTestnet ? 'Base Sepolia' : 'Base Mainnet',
        },
      });
    } else if (transaction.type === 'split') {
      // Resolve all recipient addresses
      const resolvedRecipients = await Promise.all(
        transaction.recipients.map(async (recipient) => {
          const resolved = await resolveBaseName(recipient, useTestnet);
          return resolved || null;
        })
      );

      // Filter out any recipients that couldn't be resolved
      const validRecipients = resolvedRecipients.filter(Boolean);

      if (validRecipients.length === 0) {
        return NextResponse.json(
          { error: 'Could not resolve any recipient addresses' },
          { status: 400 }
        );
      }

      // Calculate the amount per recipient
      const amountPerRecipient = transaction.amount / validRecipients.length;

      // Execute a transaction for each recipient
      const results = await Promise.all(
        validRecipients.map(async (recipient) => {
          try {
            const result = await agent.capabilities.sendTransaction.handler({
              to: recipient,
              amount: amountPerRecipient,
              token: transaction.token || 'ETH',
            });

            return {
              success: true,
              recipient,
              hash: result.hash || 'mock-tx-hash-' + Date.now() + '-' + recipient.substring(0, 6),
            };
          } catch (error) {
            console.error(`Error sending to ${recipient}:`, error);
            return {
              success: false,
              recipient,
              error: error.message,
            };
          }
        })
      );

      return NextResponse.json({
        success: true,
        transactions: results,
        details: {
          type: 'split',
          from: walletAddress,
          recipients: validRecipients,
          totalAmount: transaction.amount,
          amountPerRecipient,
          token: transaction.token || 'ETH',
          network: useTestnet ? 'Base Sepolia' : 'Base Mainnet',
        },
      });
    } else {
      return NextResponse.json(
        { error: `Unsupported transaction type: ${transaction.type}` },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error executing transaction:', error);
    return NextResponse.json(
      { error: 'Failed to execute transaction: ' + error.message },
      { status: 500 }
    );
  }
}
