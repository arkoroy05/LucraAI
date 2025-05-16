import { GoogleGenerativeAI } from '@google/generative-ai';
import { createTransactionAgent, extractTransactionDetails } from '../../../../../web3/utils/agentKit';
import { NextResponse } from 'next/server';

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY);

/**
 * Process a transaction request using Gemini AI and AgentKit
 * @param {Request} req - The request object
 * @returns {Promise<Response>} - The response object
 */
export async function POST(req) {
  try {
    // Parse the request body
    const body = await req.json();
    const { message, walletAddress, useTestnet = false } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // First, try to extract transaction details directly
    const extractedDetails = await extractTransactionDetails(message);

    // If we could extract transaction details, process them
    if (extractedDetails) {
      // Create an agent for handling the transaction
      const agent = createTransactionAgent({ useTestnet, walletAddress });

      // Try to initialize the real AgentKit
      try {
        await agent.initialize();
        console.log('Successfully initialized real AgentKit for Gemini integration');
      } catch (initError) {
        console.error('Failed to initialize real AgentKit for Gemini integration:', initError);
        // Continue with the fallback implementation
      }

      // Format a response based on the transaction type
      let response;
      if (extractedDetails.type === 'send') {
        const recipient = Array.isArray(extractedDetails.recipients) ? extractedDetails.recipients[0] : extractedDetails.recipient;
        response = `I've prepared a transaction to send ${extractedDetails.amount} ${extractedDetails.token} to ${recipient}.`;
      } else if (extractedDetails.type === 'split') {
        response = `I've prepared a request to split ${extractedDetails.amount} ${extractedDetails.token} between ${extractedDetails.recipients.join(', ')}.`;
      } else if (extractedDetails.type === 'check_balance') {
        // Use the agent's getBalance capability
        try {
          const balanceResult = await agent.capabilities.getBalance.handler();
          response = `Your current balance is ${balanceResult.balance} ${balanceResult.token} on ${balanceResult.chain}.`;
        } catch (balanceError) {
          console.error('Error fetching balance:', balanceError);
          response = 'I encountered an error while fetching your balance. Please try again later.';
        }
      } else if (extractedDetails.type === 'transaction_history') {
        // Use the agent's getTransactionHistory capability
        try {
          const historyResult = await agent.capabilities.getTransactionHistory.handler({
            limit: extractedDetails.limit || 10
          });
          
          if (historyResult.transactions && historyResult.transactions.length > 0) {
            response = `You have ${historyResult.transactions.length} recent transactions. Here are the details:`;
            historyResult.transactions.forEach((tx, index) => {
              response += `\n${index + 1}. ${tx.transaction_type} ${tx.amount} ${tx.token} to ${tx.recipient_address.substring(0, 8)}... (${tx.status})`;
            });
          } else {
            response = 'You don\'t have any transaction history yet.';
          }
        } catch (historyError) {
          console.error('Error fetching transaction history:', historyError);
          response = 'I encountered an error while fetching your transaction history. Please try again later.';
        }
      } else {
        response = `I've prepared your ${extractedDetails.type} request for ${extractedDetails.amount} ${extractedDetails.token}.`;
      }

      return NextResponse.json({
        type: 'transaction',
        details: extractedDetails,
        agentResponse: { response },
      });
    }

    // If not a transaction, use Gemini to process the message
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Create a prompt that includes context about LucraAI and crypto transactions
    const prompt = `
      You are LucraAI, a personal onchain CFO that uses natural language to help users send, split, track payments and manage wallets.
      
      User message: ${message}
      
      If this appears to be a transaction request, respond with a JSON object with the following structure:
      {
        "isTransaction": true,
        "type": "send" or "split",
        "amount": the amount to send,
        "token": the token to send (ALWAYS default to ETH if not specified),
        "recipient": the recipient address or name (for send),
        "recipients": array of recipient addresses or names (for split)
      }
      
      If this is not a transaction request, respond with a JSON object with the following structure:
      {
        "isTransaction": false,
        "response": your helpful response about crypto, wallets, or general information
      }
      
      Only respond with the JSON object, nothing else.
    `;

    // Generate a response from Gemini
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    // Parse the JSON response
    try {
      const parsedResponse = JSON.parse(text);

      // If Gemini identified this as a transaction, process it with AgentKit
      if (parsedResponse.isTransaction) {
        // Create an agent for handling the transaction
        const agent = createTransactionAgent({ useTestnet, walletAddress });

        // Try to initialize the real AgentKit
        try {
          await agent.initialize();
          console.log('Successfully initialized real AgentKit for Gemini transaction');
        } catch (initError) {
          console.error('Failed to initialize real AgentKit for Gemini transaction:', initError);
          // Continue with the fallback implementation
        }

        // Format the transaction details
        const transactionDetails = {
          type: parsedResponse.type,
          intent: parsedResponse.type,
          amount: parsedResponse.amount,
          token: parsedResponse.token || 'ETH',
          recipient: parsedResponse.recipient,
          recipients: parsedResponse.recipients || (parsedResponse.recipient ? [parsedResponse.recipient] : [])
        };

        // Format a response based on the transaction type
        let response;
        if (transactionDetails.type === 'send') {
          response = `I've prepared a transaction to send ${transactionDetails.amount} ${transactionDetails.token} to ${transactionDetails.recipient}.`;
        } else if (transactionDetails.type === 'split') {
          response = `I've prepared a request to split ${transactionDetails.amount} ${transactionDetails.token} between ${transactionDetails.recipients.join(', ')}.`;
        } else {
          response = `I've prepared your ${transactionDetails.type} request.`;
        }

        return NextResponse.json({
          type: 'transaction',
          details: transactionDetails,
          agentResponse: { response },
        });
      }

      // If not a transaction, return the Gemini response
      return NextResponse.json({
        type: 'conversation',
        response: parsedResponse.response,
      });
    } catch (jsonError) {
      console.error('Error parsing Gemini response:', jsonError);
      
      // If we can't parse the JSON, just return the text
      return NextResponse.json({
        type: 'conversation',
        response: text,
      });
    }
  } catch (error) {
    console.error('Error processing transaction request:', error);
    return NextResponse.json(
      { error: 'Failed to process transaction request' },
      { status: 500 }
    );
  }
}
