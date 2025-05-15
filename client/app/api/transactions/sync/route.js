import supabaseServer from '@/utils/supabase-server';

export async function POST(req) {
  try {
    // Parse the request body
    const body = await req.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: 'Missing wallet address' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Normalize the wallet address to lowercase
    const normalizedAddress = walletAddress.toLowerCase();

    // First check if the user exists
    const { data: user, error: userError } = await supabaseServer
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

    if (!user) {
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
    }

    // In a real implementation, you would:
    // 1. Fetch transactions from Basescan API for the wallet address
    // 2. Compare with existing transactions in the database
    // 3. Add any new transactions

    // For now, we'll just return a success message
    // This is a placeholder for future implementation

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Transaction sync initiated',
        note: 'This is a placeholder. In a real implementation, this would sync transactions from Basescan.'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in transaction sync API route:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
