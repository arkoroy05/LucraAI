import supabaseServer from '@/utils/supabase-server';

/**
 * API route to get a user by wallet address
 * This uses the server-side Supabase client with the service role key
 * which can bypass RLS policies
 */
export async function GET(req) {
  try {
    // Get the wallet address from the URL
    const { searchParams } = new URL(req.url);
    const walletAddress = searchParams.get('walletAddress');

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

    // Get the user by wallet address
    const { data: user, error } = await supabaseServer
      .from('users')
      .select('*')
      .eq('wallet_address', normalizedAddress)
      .maybeSingle();

    if (error) {
      console.error('Error getting user by wallet address:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to get user: ' + error.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Return the user data or null if not found
    return new Response(
      JSON.stringify(user || null),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in users/get API route:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error: ' + error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
