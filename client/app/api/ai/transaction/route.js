import { GoogleGenerativeAI } from '@google/generative-ai';
import { processTransactionRequest, extractTransactionDetails } from '../../../../../web3/utils/agentKit';
import { NextResponse } from 'next/server';

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Process a transaction request using AI
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
      // Process the transaction request using AgentKit
      const transactionResponse = await processTransactionRequest({
        message,
        useTestnet,
        walletAddress,
      });

      return NextResponse.json({
        type: 'transaction',
        details: extractedDetails,
        agentResponse: transactionResponse,
      });
    }

    // If not a transaction, use Gemini to process the message
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

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
        // Process the transaction request using AgentKit
        const transactionResponse = await processTransactionRequest({
          message,
          useTestnet,
          walletAddress,
        });

        return NextResponse.json({
          type: 'transaction',
          details: parsedResponse,
          agentResponse: transactionResponse,
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
