import supabaseServer from '@/utils/supabase-server';

/**
 * API endpoint to create a new conversation
 * This uses the server-side Supabase client with the service role key
 * which can bypass RLS policies
 */
export async function POST(req) {
  try {
    // Parse the request body
    const body = await req.json();
    const { walletAddress, title } = body;

    // Validate required fields
    if (!walletAddress || !title) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Normalize the wallet address
    const normalizedAddress = walletAddress.toLowerCase();

    // First ensure user exists
    let userId;

    // Check if user exists
    const { data: user, error: userError } = await supabaseServer
      .from('users')
      .select('id')
      .eq('wallet_address', normalizedAddress)
      .maybeSingle();

    if (userError) {
      console.error('Error checking for user:', userError);
      return new Response(
        JSON.stringify({ error: 'Failed to check for user: ' + userError.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    if (user) {
      userId = user.id;
    } else {
      // Create the user if they don't exist
      console.log(`Creating new user with wallet address ${normalizedAddress}`);
      
      const { data: newUser, error: insertError } = await supabaseServer
        .from('users')
        .insert([
          {
            wallet_address: normalizedAddress,
            wallet_type: 'wagmi',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select('id')
        .single();

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

      userId = newUser.id;
    }

    // Create the conversation
    const { data: conversation, error: conversationError } = await supabaseServer
      .from('chat_conversations')
      .insert([
        {
          user_id: userId,
          title,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select('id')
      .single();

    if (conversationError) {
      console.error('Error creating conversation:', conversationError);
      return new Response(
        JSON.stringify({ error: 'Failed to create conversation: ' + conversationError.message }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        conversationId: conversation.id 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error in conversation create endpoint:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error: ' + error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 