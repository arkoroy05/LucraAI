import { NextResponse } from 'next/server';
import supabaseServer from '@/utils/supabase-server';

/**
 * API route to add a message to a conversation
 * This bypasses RLS policies by using the service role key
 */
export async function POST(req) {
  try {
    // Parse the request body
    const body = await req.json();
    const { conversationId, userId, message, isUser, metadata } = body;

    // Validate required parameters
    if (!conversationId || !userId || !message) {
      console.error('Missing required parameters for add-message API:', {
        conversationId: !!conversationId,
        userId: !!userId,
        message: !!message
      });
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Ensure conversationId is a number
    const numericConversationId = typeof conversationId === 'string'
      ? parseInt(conversationId, 10)
      : conversationId;

    if (isNaN(numericConversationId)) {
      console.error('Invalid conversationId:', conversationId);
      return NextResponse.json(
        { error: 'Invalid conversation ID' },
        { status: 400 }
      );
    }

    // First, verify that the conversation exists
    const { data: conversation, error: conversationError } = await supabaseServer
      .from('chat_conversations')
      .select('id')
      .eq('id', numericConversationId)
      .single();

    if (conversationError) {
      console.error('Error checking conversation:', conversationError);
      return NextResponse.json(
        { error: 'Error checking conversation: ' + conversationError.message },
        { status: 500 }
      );
    }

    if (!conversation) {
      console.error('Conversation not found:', numericConversationId);
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Verify that the user exists
    const { data: user, error: userError } = await supabaseServer
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Error checking user:', userError);
      return NextResponse.json(
        { error: 'Error checking user: ' + userError.message },
        { status: 500 }
      );
    }

    if (!user) {
      console.error('User not found:', userId);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Prepare the message data
    const messageData = {
      user_id: userId,
      conversation_id: numericConversationId,
      message: message,
      is_user: isUser === true || isUser === 'true',
      created_at: new Date().toISOString()
    };

    // Only add metadata if it's not null or undefined
    if (metadata !== null && metadata !== undefined) {
      messageData.metadata = metadata;
    }

    console.log('Inserting message with data:', messageData);

    // Insert the message
    const { data: newMessage, error: insertError } = await supabaseServer
      .from('chat_history')
      .insert(messageData)
      .select('id')
      .single();

    if (insertError) {
      console.error('Error adding message:', insertError);
      return NextResponse.json(
        { error: 'Error adding message: ' + insertError.message },
        { status: 500 }
      );
    }

    // Update the conversation's updated_at timestamp
    const { error: updateError } = await supabaseServer
      .from('chat_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', numericConversationId);

    if (updateError) {
      console.error('Error updating conversation timestamp:', updateError);
      // Continue anyway since the message was added successfully
    }

    return NextResponse.json({
      success: true,
      messageId: newMessage.id
    });
  } catch (error) {
    console.error('Error in add-message API:', error);
    return NextResponse.json(
      { error: 'Server error: ' + (error.message || 'Unknown error') },
      { status: 500 }
    );
  }
}
