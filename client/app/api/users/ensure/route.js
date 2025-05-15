import supabaseServer from '@/utils/supabase-server';

/**
 * API route to ensure a user exists in the database
 * If the user doesn't exist, it will be created
 */
export async function POST(req) {
  try {
    // Parse the request body
    const body = await req.json();
    const { walletAddress, walletType = 'wagmi' } = body;

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

    // If user exists, return success
    if (existingUser) {
      return new Response(
        JSON.stringify({
          message: 'User already exists',
          user: existingUser
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // User doesn't exist, create them with a UUID
    const uuid = crypto.randomUUID();
    const { data: newUser, error: insertError } = await supabaseServer
      .from('users')
      .insert([
        {
          id: uuid,
          wallet_address: normalizedAddress,
          wallet_type: walletType || 'wagmi',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select();

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

    return new Response(
      JSON.stringify({
        message: 'User created successfully',
        user: newUser
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in users/ensure API route:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error: ' + error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
