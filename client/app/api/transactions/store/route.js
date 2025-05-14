import supabaseServer from '@/utils/supabase-server';

export async function POST(req) {
  try {
    // Parse the request body
    const body = await req.json();
    const { 
      transactionHash, 
      recipientAddress, 
      amount, 
      token, 
      walletAddress, 
      transactionType, 
      status, 
      note 
    } = body;

    // Validate required fields
    if (!transactionHash || !recipientAddress || !amount || !walletAddress) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // First check if the user exists
    const { data: user } = await supabaseServer
      .from('users')
      .select('id')
      .eq('wallet_address', walletAddress)
      .single();
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Store the transaction
    const { data, error } = await supabaseServer
      .from('transactions')
      .insert([
        {
          user_id: user.id,
          transaction_hash: transactionHash,
          transaction_type: transactionType || 'send',
          amount,
          token: token || 'ETH',
          recipient_address: recipientAddress,
          status: status || 'pending',
          note: note || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          metadata: {
            network: body.network || 'base',
            explorer_url: body.explorerUrl || `https://basescan.org/tx/${transactionHash}`
          }
        }
      ]);

    if (error) {
      console.error('Error storing transaction:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to store transaction' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in transaction store API:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
