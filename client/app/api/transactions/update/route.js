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
