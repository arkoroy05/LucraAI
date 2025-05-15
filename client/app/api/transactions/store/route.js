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

    // Normalize the wallet address to lowercase
    const normalizedAddress = walletAddress.toLowerCase();

    // First check if the user exists
    let userData;
    const { data: existingUser, error: userError } = await supabaseServer
      .from('users')
      .select('id')
      .eq('wallet_address', normalizedAddress)
      .maybeSingle();

    if (userError) {
      console.error('Error checking for user:', userError);
      return new Response(
        JSON.stringify({ error: 'Database error: ' + userError.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (!existingUser) {
      // Create the user if they don't exist
      const { error: insertError } = await supabaseServer
        .from('users')
        .insert([
          {
            wallet_address: normalizedAddress,
            wallet_type: 'wagmi',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ]);

      if (insertError) {
        console.error('Error creating user:', insertError);
        return new Response(
          JSON.stringify({ error: 'Failed to create user: ' + insertError.message }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      // Get the newly created user
      const { data: newUser, error: newUserError } = await supabaseServer
        .from('users')
        .select('id')
        .eq('wallet_address', normalizedAddress)
        .single();

      if (newUserError || !newUser) {
        console.error('Error retrieving newly created user:', newUserError);
        return new Response(
          JSON.stringify({ error: 'User created but could not be retrieved' }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      // Use the newly created user
      userData = newUser;
    } else {
      userData = existingUser;
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
