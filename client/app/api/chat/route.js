import { GoogleGenerativeAI } from '@google/generative-ai';
import supabaseServer from '@/utils/supabase-server';

// Initialize the Google Generative AI with your API key
// Access the API key directly from the environment variable
// For debugging, we'll log if the key is available (without exposing it)
// Updated to fix streaming issues and ensure proper response format
// This is a standard JSON response, not a streaming response
const apiKey = process.env.GOOGLE_API_KEY;
console.log('API Key available:', !!apiKey, 'Length:', apiKey ? apiKey.length : 0);

// Make sure we have a valid API key
if (!apiKey) {
  console.error('GOOGLE_API_KEY environment variable is not set or is empty');
}

// Initialize the Generative AI client with the API key
const genAI = new GoogleGenerativeAI(apiKey);

// Function to parse user message and extract payment details
async function parseUserMessage(message) {
  try {
    // Simple rule-based fallback parser in case the AI model fails
    function simpleParser(text) {
      const lowerText = text.toLowerCase();
      let intent = 'unknown';
      let amount = null;
      let token = 'USDC';
      let recipients = [];
      let splitType = null;
      let note = null;

      // Extract recipients (anything with @ symbol)
      const recipientMatches = text.match(/@(\w+(\.\w+)?)/g);
      if (recipientMatches) {
        recipients = recipientMatches.map(r => r.substring(1));
      }

      // Extract amount (any number)
      const amountMatch = text.match(/\b(\d+(\.\d+)?)\b/);
      if (amountMatch) {
        amount = parseFloat(amountMatch[0]);
      }

      // Determine intent
      if (lowerText.includes('send') || lowerText.includes('pay') || lowerText.includes('transfer')) {
        intent = 'send';
      } else if (lowerText.includes('split')) {
        intent = 'split';
        if (lowerText.includes('equal') || lowerText.includes('equally')) {
          splitType = 'equal';
        }
      } else if (lowerText.includes('balance') || lowerText.includes('check')) {
        intent = 'check_balance';
      } else if (lowerText.includes('history') || lowerText.includes('transactions')) {
        intent = 'transaction_history';
      }

      // Extract note (anything after "for" or "note")
      const noteMatch = lowerText.match(/\b(for|note)\b\s+(.+)$/);
      if (noteMatch) {
        note = noteMatch[2];
      }

      return {
        intent,
        amount,
        token,
        recipients,
        split_type: splitType,
        note,
        raw_message: text,
        parsed_by: 'fallback'
      };
    }

    // Create a generative model instance
    // Use the correct model name for the current API version
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Define the system prompt to guide the model
    const systemPrompt = `
      You are an AI assistant for a crypto wallet app called Lucra AI.
      Your task is to parse user messages and identify payment-related intents.

      Extract the following information from the user message:
      1. Intent (send, split, check_balance, transaction_history, chat_history, history, etc.)
      2. Amount (if applicable)
      3. Currency/Token (default to USDC if not specified)
      4. Recipients (extract names/addresses with @ symbol if present)
      5. Split type (equal, percentage, custom amounts)
      6. Reason/note for the transaction (if provided)
      7. History type (transactions, chat, all) for history-related intents
      8. Limit (number of records to return) for history-related intents

      Return the extracted information in JSON format with these fields:
      {
        "intent": string,
        "amount": number or null,
        "token": string,
        "recipients": array of strings,
        "split_type": string or null,
        "note": string or null,
        "history_type": string or null,
        "limit": number or null
      }

      Examples:
      - "Send 50 USDC to @alice.base" → {"intent": "send", "amount": 50, "token": "USDC", "recipients": ["alice.base"], "split_type": null, "note": null}
      - "Split 100 equally between @bob and @charlie for dinner" → {"intent": "split", "amount": 100, "token": "USDC", "recipients": ["bob", "charlie"], "split_type": "equal", "note": "for dinner"}
      - "Check my balance" → {"intent": "check_balance", "amount": null, "token": null, "recipients": [], "split_type": null, "note": null}
      - "Show my transaction history" → {"intent": "transaction_history", "history_type": "transactions", "limit": 10}
      - "Show my chat history" → {"intent": "chat_history", "history_type": "chat", "limit": 10}
      - "Show my last 5 transactions" → {"intent": "transaction_history", "history_type": "transactions", "limit": 5}
    `;

    try {
      // Generate content with the model
      // Gemini doesn't support system role, so we'll combine the system prompt with the user message
      const combinedPrompt = `${systemPrompt}

User message: "${message}"

Please analyze the message and extract the information as JSON. If you're not sure about a field, use null.
Return ONLY the JSON object without any additional text, explanation, or markdown formatting.

Extracted JSON:`;

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: combinedPrompt }] }],
        generationConfig: {
          temperature: 0.1, // Lower temperature for more deterministic outputs
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 1024,
        },
      });

      // Get the response text
      const responseText = result.response.text();

      // Try to parse the JSON response
      try {
        // Clean up the response text to extract just the JSON
        let cleanedResponse = responseText.trim();

        // Remove any markdown code block markers
        cleanedResponse = cleanedResponse.replace(/```json/g, '').replace(/```/g, '');

        // Extract JSON from the response (in case the model wraps it in text or explanations)
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
        const jsonString = jsonMatch ? jsonMatch[0] : cleanedResponse;

        // Parse the JSON
        const parsedData = JSON.parse(jsonString);

        // Add the raw message to the parsed data
        parsedData.raw_message = message;
        parsedData.parsed_by = 'gemini';

        // Ensure all required fields exist
        parsedData.intent = parsedData.intent || null;
        parsedData.amount = parsedData.amount || null;
        parsedData.token = parsedData.token || 'USDC';
        parsedData.recipients = parsedData.recipients || [];
        parsedData.split_type = parsedData.split_type || null;
        parsedData.note = parsedData.note || null;

        // Log the parsed data to console
        console.log('Parsed message (Gemini):', parsedData);

        return parsedData;
      } catch (jsonError) {
        console.error('Error parsing JSON from model response:', jsonError);
        console.log('Raw model response:', responseText);

        // Fall back to simple parser
        console.log('Falling back to simple parser');
        return simpleParser(message);
      }
    } catch (modelError) {
      console.error('Error calling Gemini model:', modelError);

      // Fall back to simple parser
      console.log('Falling back to simple parser due to model error');
      return simpleParser(message);
    }
  } catch (error) {
    console.error('Error in parseUserMessage:', error);

    // Return a basic structure for any unexpected errors
    return {
      intent: 'unknown',
      amount: null,
      token: 'USDC',
      recipients: [],
      split_type: null,
      note: null,
      raw_message: message,
      error: error.message,
      parsed_by: 'error_handler'
    };
  }
}

// Function to generate AI response based on parsed data
async function generateAIResponse(parsedData, walletAddress) {
  const { intent, amount, token, recipients, split_type, note, error, history_type, limit } = parsedData;

  // If there was an error in parsing
  if (error) {
    return `I'm sorry, I couldn't understand that request. Could you please rephrase it?`;
  }

  // Generate response based on intent
  switch (intent) {
    case 'send':
      const recipientText = recipients && recipients.length > 0
        ? recipients.map(r => `@${r}`).join(' and ')
        : 'the recipient';

      return `I've prepared a transaction to send ${amount} ${token} to ${recipientText}${note ? ` ${note}` : ''}. Would you like to confirm this transaction?`;

    case 'split':
      const splitRecipients = recipients && recipients.length > 0
        ? recipients.map(r => `@${r}`).join(' and ')
        : 'the recipients';
      const splitTypeText = split_type === 'equal' ? 'equally' : 'as specified';

      return `I'll split ${amount} ${token} ${splitTypeText} between ${splitRecipients}${note ? ` ${note}` : ''}. Is this correct?`;

    case 'check_balance':
      // We'll fetch the actual balance from the client side
      // and replace this placeholder in the UI
      return `__FETCH_BALANCE__`;

    case 'transaction_history':
    case 'chat_history':
    case 'history':
      if (walletAddress) {
        try {
          // Determine the history type
          const historyType = history_type || (intent === 'transaction_history' ? 'transactions' : intent === 'chat_history' ? 'chat' : 'all');
          const historyLimit = limit || 10;

          // Call the history function directly using supabaseServer
          const { data, error: historyError } = await supabaseServer.rpc('get_history', {
            p_wallet_address: walletAddress,
            p_type: historyType,
            p_limit: historyLimit
          });

          if (historyError) {
            console.error('Error fetching history:', historyError);
            // Fallback response if API call fails
            return `I'm having trouble retrieving your ${historyType === 'transactions' ? 'transaction' : historyType === 'chat' ? 'chat' : ''} history right now. Please try again later.`;
          }

          if (historyType === 'transactions') {
            if (!data || data.length === 0) {
              return `You don't have any transaction history yet. Once you make transactions, they'll appear here.`;
            }

            let totalAmount = 0;
            const recentDate = new Date(data[0].created_at);

            data.forEach(tx => {
              if (tx.amount) totalAmount += parseFloat(tx.amount);
            });

            return `Here's your recent transaction history. You've made ${data.length} transactions, with the most recent on ${recentDate.toLocaleDateString()}, totaling approximately ${totalAmount.toFixed(2)} ${data[0].token || 'USDC'}.`;
          } else if (historyType === 'chat') {
            if (!data || data.length === 0) {
              return `You don't have any chat history yet. As we converse, your chat history will be saved here.`;
            }

            const recentDate = new Date(data[0].created_at);
            return `I found ${data.length} messages in your chat history, with the most recent from ${recentDate.toLocaleDateString()}.`;
          } else {
            // Combined history
            if (!data || data.length === 0) {
              return `You don't have any history yet. As you use Lucra AI, your history will be saved here.`;
            }

            const txCount = data.filter(item => item.transaction_type).length;
            const chatCount = data.filter(item => item.is_user !== undefined).length;

            return `I found ${data.length} items in your history: ${txCount} transactions and ${chatCount} chat messages.`;
          }
        } catch (error) {
          console.error('Error fetching history:', error);
          return `I'm having trouble retrieving your history right now. Please try again later.`;
        }
      } else {
        return `Please connect your wallet to view your ${intent === 'transaction_history' ? 'transaction' : intent === 'chat_history' ? 'chat' : ''} history.`;
      }

    default:
      return `I understand you want to ${intent || 'do something'}. How can I help you with that?`;
  }
}

export async function POST(req) {
  try {
    // Check if API key is available
    if (!apiKey) {
      console.error('API key is missing. Please check your environment variables.');
      return new Response(
        JSON.stringify({ error: 'API key is missing' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse the request body
    const body = await req.json();
    const { messages, walletAddress } = body;

    // Get the last user message
    const lastUserMessage = messages[messages.length - 1];

    if (!lastUserMessage || lastUserMessage.role !== 'user') {
      return new Response(
        JSON.stringify({ error: 'Invalid request: No user message found' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    try {
      // Parse the user message
      const parsedData = await parseUserMessage(lastUserMessage.content);

      // Generate AI response
      const aiResponse = await generateAIResponse(parsedData, walletAddress);

      // Store the user message in Supabase if wallet address is provided
      if (walletAddress) {
        try {
          // First check if the user exists
          const { data: user } = await supabaseServer
            .from('users')
            .select('id')
            .eq('wallet_address', walletAddress)
            .single();

          if (user) {
            // Store the user message
            await supabaseServer
              .from('chat_history')
              .insert([
                {
                  user_id: user.id,
                  message: lastUserMessage.content,
                  is_user: true,
                  created_at: new Date().toISOString()
                }
              ]);

            // Store the AI response
            await supabaseServer
              .from('chat_history')
              .insert([
                {
                  user_id: user.id,
                  message: aiResponse,
                  is_user: false,
                  created_at: new Date().toISOString(),
                  metadata: parsedData.intent === 'send' || parsedData.intent === 'split' ? { transaction: parsedData } : null
                }
              ]);

            // If this is a transaction, store it in the transactions table
            if (parsedData.intent === 'send' || parsedData.intent === 'split') {
              await supabaseServer
                .from('transactions')
                .insert([
                  {
                    user_id: user.id,
                    transaction_hash: null, // Will be updated when the transaction is executed
                    transaction_type: parsedData.intent,
                    amount: parsedData.amount || 0,
                    token: parsedData.token || 'USDC',
                    recipient_address: parsedData.recipients && parsedData.recipients.length > 0
                      ? parsedData.recipients[0]
                      : 'unknown',
                    status: 'pending',
                    note: parsedData.note || '',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    metadata: parsedData
                  }
                ]);
            }
          } else {
            console.log('User not found in database:', walletAddress);
          }
        } catch (dbError) {
          console.error('Error storing message in database:', dbError);
          // Continue with the response even if database storage fails
        }
      }

      // Create a response in the format expected by the Vercel AI SDK
      // For text-based responses (non-streaming), we need to return plain text
      // This is compatible with streamProtocol: 'text' in the client
      console.log('Sending response text:', aiResponse);

      // Create a simple text response
      return new Response(aiResponse, {
        headers: {
          'Content-Type': 'text/plain',
          'X-Parsed-Data': JSON.stringify(parsedData)
        }
      });
    } catch (parseError) {
      console.error('Error parsing message:', parseError);

      // Fallback response when parsing fails
      const fallbackData = {
        intent: 'unknown',
        raw_message: lastUserMessage.content
      };

      const fallbackResponse = 'I understand you said: "' + lastUserMessage.content + '". How can I help you with that?';

      // Store the messages in Supabase if wallet address is provided
      if (walletAddress) {
        try {
          // First check if the user exists
          const { data: user } = await supabaseServer
            .from('users')
            .select('id')
            .eq('wallet_address', walletAddress)
            .single();

          if (user) {
            // Store the user message
            await supabaseServer
              .from('chat_history')
              .insert([
                {
                  user_id: user.id,
                  message: lastUserMessage.content,
                  is_user: true,
                  created_at: new Date().toISOString()
                }
              ]);

            // Store the AI response
            await supabaseServer
              .from('chat_history')
              .insert([
                {
                  user_id: user.id,
                  message: fallbackResponse,
                  is_user: false,
                  created_at: new Date().toISOString()
                }
              ]);
          }
        } catch (dbError) {
          console.error('Error storing message in database:', dbError);
          // Continue with the response even if database storage fails
        }
      }

      return new Response(fallbackResponse, {
        headers: {
          'Content-Type': 'text/plain',
          'X-Parsed-Data': JSON.stringify(fallbackData)
        }
      });
    }
  } catch (error) {
    console.error('Error in chat API route:', error);
    return new Response(
      'Sorry, an error occurred while processing your request.',
      {
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      }
    );
  }
}