import supabaseServer from '@/utils/supabase-server';

/**
 * API route to store a user's wallet address
 * This uses the server-side Supabase client with the service role key
 * which can bypass RLS policies
 */
export async function POST(req) {
  try {
    // Parse the request body
    const body = await req.json();
    const { walletAddress, walletType } = body;

    // Validate required fields
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

    // Check if the user already exists
    const { data: existingUser, error: userError } = await supabaseServer
      .from('users')
      .select('id, wallet_address, updated_at')
      .eq('wallet_address', normalizedAddress)
      .maybeSingle();

    if (userError) {
      console.error('Error checking for existing user:', userError);
      return new Response(
        JSON.stringify({ error: 'Failed to check for existing user: ' + userError.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    let userData;

    if (existingUser) {
      // User exists, update the last login time
      const { data, error: updateError } = await supabaseServer
        .from('users')
        .update({
          updated_at: new Date().toISOString(),
          wallet_type: walletType || existingUser.wallet_type || 'unknown'
        })
        .eq('wallet_address', normalizedAddress)
        .select();

      if (updateError) {
        console.error('Error updating user:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update user: ' + updateError.message }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      userData = data?.[0] || existingUser;
    } else {
      // User doesn't exist, create a new record
      const { data, error: insertError } = await supabaseServer
        .from('users')
        .insert([
          {
            wallet_address: normalizedAddress,
            wallet_type: walletType || 'unknown',
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

      userData = data?.[0];
    }

    // Return the user data
    return new Response(
      JSON.stringify(userData),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in users/store API route:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error: ' + error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
