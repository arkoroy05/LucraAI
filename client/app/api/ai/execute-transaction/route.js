import { NextResponse } from 'next/server';
import { createTransactionAgent } from '@/web3/utils/agentKit';
import { resolveBaseName, lookupBaseName as lookupBaseNameService } from '@/web3/utils/baseNameService';
import { isAddress } from 'viem';
import supabaseServer from '@/utils/supabase-server';

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

    console.log('Executing transaction:', transaction);
    console.log('Wallet address:', walletAddress);
    console.log('Using testnet:', useTestnet);

    // Create an agent for handling the transaction
    const agent = createTransactionAgent({ useTestnet, walletAddress });

    // Try to initialize the real AgentKit
    try {
      await agent.initialize();
      console.log('Successfully initialized real AgentKit for transaction execution');
    } catch (initError) {
      console.error('Failed to initialize real AgentKit for transaction execution:', initError);
      // Continue with the fallback implementation
    }

    // Execute the transaction based on its type
    if (transaction.type === 'send') {
      // Check if the recipient is an address with a basename format (0xname.base.eth)
      let resolvedRecipient;
      const recipient = transaction.recipient;

      // Handle the case where the recipient looks like an address but has a .base or .eth suffix
      if (recipient.startsWith('0x') && (recipient.includes('.base') || recipient.includes('.eth'))) {
        console.log(`Recipient appears to be an address with basename format: ${recipient}`);

        // Extract the address part (everything before the first dot)
        const addressPart = recipient.split('.')[0];

        if (isAddress(addressPart)) {
          console.log(`Valid address found in recipient: ${addressPart}`);
          resolvedRecipient = addressPart;

          // Log a warning about the format
          console.warn(`Recipient was in format "0xaddress.base.eth". Using address part: ${resolvedRecipient}`);
        } else {
          // If it's not a valid address, try to resolve it as a basename
          resolvedRecipient = await resolveBaseName(recipient, useTestnet);
        }
      } else if (isAddress(recipient)) {
        // If it's already a valid address, use it directly
        resolvedRecipient = recipient;

        // Try to lookup the basename for this address (for informational purposes)
        try {
          // Always use mainnet for basename lookups
          const basename = await lookupBaseNameService(recipient);
          if (basename) {
            console.log(`Found basename for ${recipient}: ${basename}`);
          }
        } catch (lookupError) {
          console.warn(`Failed to lookup basename for address ${recipient}:`, lookupError);
        }
      } else {
        // Otherwise, try to resolve it as a basename
        resolvedRecipient = await resolveBaseName(recipient, useTestnet);
      }

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

      // Store the transaction in the database
      try {
        // First check if the user exists
        const { data: user } = await supabaseServer
          .from('users')
          .select('id')
          .eq('wallet_address', walletAddress)
          .single();

        if (user) {
          // Store the transaction
          await supabaseServer
            .from('transactions')
            .insert([
              {
                user_id: user.id,
                transaction_hash: result.hash || 'mock-tx-hash-' + Date.now(),
                transaction_type: 'send',
                amount: transaction.amount,
                token: transaction.token || 'ETH',
                recipient_address: resolvedRecipient,
                status: 'pending',
                note: transaction.note || '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                metadata: transaction
              }
            ]);
        }
      } catch (dbError) {
        console.error('Error storing transaction in database:', dbError);
        // Continue with the response even if database storage fails
      }

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
      // Resolve all recipient addresses with the same logic as above
      const resolvedRecipients = await Promise.all(
        transaction.recipients.map(async (recipient) => {
          // Handle the case where the recipient looks like an address but has a .base or .eth suffix
          if (recipient.startsWith('0x') && (recipient.includes('.base') || recipient.includes('.eth'))) {
            console.log(`Split recipient appears to be an address with basename format: ${recipient}`);

            // Extract the address part (everything before the first dot)
            const addressPart = recipient.split('.')[0];

            if (isAddress(addressPart)) {
              console.log(`Valid address found in split recipient: ${addressPart}`);
              return addressPart;
            }
          }

          // Otherwise try to resolve as a basename or use directly if it's an address
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

      // Store the transaction in the database
      try {
        // First check if the user exists
        const { data: user } = await supabaseServer
          .from('users')
          .select('id')
          .eq('wallet_address', walletAddress)
          .single();

        if (user) {
          // Store the transaction
          await supabaseServer
            .from('transactions')
            .insert([
              {
                user_id: user.id,
                transaction_hash: results[0].hash,
                transaction_type: 'split',
                amount: transaction.amount,
                token: transaction.token || 'ETH',
                recipient_address: validRecipients.join(','),
                status: 'pending',
                note: transaction.note || '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                metadata: {
                  ...transaction,
                  results
                }
              }
            ]);
        }
      } catch (dbError) {
        console.error('Error storing transaction in database:', dbError);
        // Continue with the response even if database storage fails
      }

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
