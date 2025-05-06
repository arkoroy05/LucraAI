import supabaseServer from '@/utils/supabase-server';
import { formatDistanceToNow, format } from 'date-fns';

export async function POST(req) {
  try {
    // Parse the request body
    const body = await req.json();
    const { walletAddress, type = 'all', limit = 10 } = body;

    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: 'Missing wallet address' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Call the get_history stored procedure
    const { data, error: historyError } = await supabaseServer.rpc('get_history', {
      p_wallet_address: walletAddress,
      p_type: type,
      p_limit: limit
    });

    if (historyError) {
      console.error('Error fetching history:', historyError);
      return new Response(
        JSON.stringify({ error: 'Failed to retrieve history' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (!data || data.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          data: [],
          formattedResponse: `No ${type === 'transactions' ? 'transaction' : type === 'chat' ? 'chat' : ''} history found.`
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    let formattedResponse = '';

    // Separate transactions and chat messages
    const transactions = data.filter(item => item.transaction_type);
    const messages = data.filter(item => item.is_user !== undefined);

    // Format transaction data for AI response
    if (transactions.length > 0) {
      formattedResponse += "## Transaction History\n\n";
      transactions.forEach((tx, index) => {
        const date = new Date(tx.created_at);
        formattedResponse += `${index + 1}. **${tx.transaction_type.toUpperCase()}**: ${tx.amount} ${tx.token} to ${tx.recipient_address}\n`;
        formattedResponse += `   - **Status**: ${tx.status}\n`;
        formattedResponse += `   - **Date**: ${format(date, 'PPP')} (${formatDistanceToNow(date, { addSuffix: true })})\n`;
        if (tx.note) formattedResponse += `   - **Note**: ${tx.note}\n`;
        if (tx.transaction_hash) formattedResponse += `   - **Hash**: ${tx.transaction_hash}\n`;
        formattedResponse += '\n';
      });
    } else if (type === 'transactions') {
      formattedResponse += "No transaction history found.\n\n";
    }

    // Format chat data for AI response
    if (messages.length > 0) {
      formattedResponse += "## Chat History\n\n";
      messages.forEach((msg, index) => {
        const date = new Date(msg.created_at);
        formattedResponse += `${index + 1}. **${msg.is_user ? 'You' : 'AI'}**: ${msg.message.substring(0, 100)}${msg.message.length > 100 ? '...' : ''}\n`;
        formattedResponse += `   - **Date**: ${format(date, 'PPP')} (${formatDistanceToNow(date, { addSuffix: true })})\n\n`;
      });
    } else if (type === 'chat') {
      formattedResponse += "No chat history found.\n\n";
    }

    return new Response(
      JSON.stringify({
        success: true,
        data,
        formattedResponse: formattedResponse || "No history found for this wallet address."
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in history API route:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
