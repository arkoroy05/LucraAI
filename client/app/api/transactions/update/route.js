import supabaseServer from '@/utils/supabase-server';

export async function POST(req) {
  try {
    // Parse the request body
    const body = await req.json();
    const { transactionId, transactionHash, status, walletAddress } = body;

    if (!transactionId || !status || !walletAddress) {
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

    // Update the transaction
    const { data, error } = await supabaseServer
      .from('transactions')
      .update({
        transaction_hash: transactionHash,
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', transactionId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating transaction:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to update transaction' }),
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
    console.error('Error in transaction update API route:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
