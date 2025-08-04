// ==========================================
// ODIA WhatsApp Voice Processing Webhook
// Production-ready voice-to-text handler
// File: api/webhook/whatsapp.js
// ==========================================

import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';
import crypto from 'crypto';

// Initialize services with production credentials
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://qgqfiluokypqmloknxlh.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
);

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID || 'ACcc73a8bd8232bf258ff5dd3cd3e42768',
  process.env.TWILIO_AUTH_TOKEN || '545af6147ea4dc6fa43ff039a8362de8'
);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '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';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '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';

export default async function handler(req, res) {
  // CORS headers for production
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Twilio-Signature');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Health check endpoint
  if (req.method === 'GET') {
    return res.status(200).json({
      status: '🚀 ODIA WhatsApp Webhook Active',
      service: 'whatsapp-voice-processor',
      timestamp: new Date().toISOString(),
      ready: true,
      version: '2.1.0'
    });
  }

  // Only allow POST for webhooks
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📨 WhatsApp webhook received:', {
      headers: req.headers,
      body: req.body
    });

    // Validate Twilio signature in production
    if (process.env.NODE_ENV === 'production') {
      const twilioSignature = req.headers['x-twilio-signature'];
      if (!validateTwilioSignature(req.body, twilioSignature)) {
        console.log('❌ Invalid Twilio signature');
        return res.status(403).json({ error: 'Invalid signature' });
      }
    }

    const {
      Body: messageBody,
      From: fromNumber,
      To: toNumber,
      MessageSid: messageSid,
      MediaUrl0: audioUrl,
      MediaContentType0: mediaType,
      ProfileName: profileName
    } = req.body;

    // Validate required fields
    if (!fromNumber || !messageSid) {
      console.log('❌ Missing required fields');
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Clean phone numbers
    const cleanFrom = fromNumber.replace('whatsapp:', '');
    const cleanTo = toNumber ? toNumber.replace('whatsapp:', '') : '';

    // Check rate limits
    const rateLimitPassed = await checkRateLimit(cleanFrom, 'whatsapp');
    if (!rateLimitPassed) {
      await sendWhatsAppMessage(cleanFrom, "⚠️ Too many requests. Please wait a moment before sending another voice message.");
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    // Handle voice messages - CORE FUNCTIONALITY
    if (audioUrl && mediaType && mediaType.includes('audio')) {
      console.log('🎤 Processing voice message from:', cleanFrom);
      
      const result = await processVoiceMessage({
        audioUrl,
        fromNumber: cleanFrom,
        toNumber: cleanTo,
        messageSid,
        profileName
      });

      return res.status(200).json(result);
    } 
    
    // Handle text messages with helpful instructions
    else if (messageBody) {
      console.log('💬 Text message received:', messageBody);
      
      // Check for specific commands
      if (messageBody.toLowerCase().includes('help')) {
        await sendWhatsAppMessage(cleanFrom, getHelpMessage());
      } else if (messageBody.toLowerCase().includes('upgrade')) {
        await sendWhatsAppMessage(cleanFrom, getUpgradeMessage());
      } else {
        await sendWhatsAppMessage(cleanFrom, getVoiceInstructions());
      }
      
      return res.status(200).json({ 
        status: 'instruction_sent',
        message: 'Instruction message sent'
      });
    }
    
    // Unknown message type
    else {
      console.log('❓ Unknown message type');
      await sendWhatsAppMessage(cleanFrom, "Sorry, I can only process voice messages. Please send a voice note! 🎤");
      
      return res.status(200).json({ 
        status: 'unsupported_message',
        message: 'Only voice messages supported'
      });
    }

  } catch (error) {
    console.error('❌ Webhook error:', error);
    
    // Log error to Supabase
    await logSystemError('whatsapp-webhook', error.message, req.body);
    
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// ==========================================
// CORE VOICE PROCESSING FUNCTION
// ==========================================
async function processVoiceMessage({ audioUrl, fromNumber, toNumber, messageSid, profileName }) {
  const startTime = Date.now();
  
  try {
    console.log('🔄 Starting voice processing pipeline...');

    // Send immediate acknowledgment
    await sendWhatsAppMessage(fromNumber, "🎧 Processing your voice message...");

    // Step 1: Download audio file with authentication
    console.log('📥 Downloading audio from:', audioUrl);
    const audioResponse = await fetch(audioUrl, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`
      }
    });

    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio: ${audioResponse.status}`);
    }

    const audioBuffer = await audioResponse.arrayBuffer();
    console.log('✅ Audio downloaded, size:', audioBuffer.byteLength, 'bytes');

    // Check audio size limit (5MB)
    if (audioBuffer.byteLength > 5 * 1024 * 1024) {
      await sendWhatsAppMessage(fromNumber, "⚠️ Voice message too large. Please keep it under 5MB.");
      return { status: 'audio_too_large' };
    }

    // Step 2: Transcribe with OpenAI Whisper
    console.log('🎯 Transcribing with OpenAI Whisper...');
    const transcription = await transcribeAudio(audioBuffer);
    console.log('✅ Transcription:', transcription);

    if (!transcription || transcription.trim().length === 0) {
      await sendWhatsAppMessage(fromNumber, "🤔 I couldn't understand your voice message clearly. Could you try speaking a bit louder and clearer?");
      return { status: 'transcription_failed' };
    }

    // Step 3: Check cache for similar queries
    const cachedResponse = await checkResponseCache(transcription);
    let claudeResponse;

    if (cachedResponse) {
      console.log('🎯 Using cached response');
      claudeResponse = cachedResponse;
    } else {
      // Step 4: Process with Claude AI
      console.log('🧠 Processing with Claude AI...');
      claudeResponse = await getClaudeResponse(transcription, fromNumber, profileName);
      console.log('✅ Claude response:', claudeResponse);

      // Cache the response
      await cacheResponse(transcription, claudeResponse);
    }

    // Step 5: Send response with formatting
    const formattedResponse = formatWhatsAppResponse(transcription, claudeResponse);
    await sendWhatsAppMessage(fromNumber, formattedResponse);

    // Step 6: Log to database
    const processingTime = Date.now() - startTime;
    await logVoiceSession({
      messageSid,
      fromNumber,
      toNumber,
      profileName,
      transcription,
      claudeResponse,
      processingTime,
      audioUrl,
      audioSize: audioBuffer.byteLength
    });

    console.log('✅ Voice processing complete!');
    return { 
      status: 'success',
      transcription,
      response: claudeResponse,
      processingTime: `${processingTime}ms`
    };

  } catch (error) {
    console.error('❌ Voice processing error:', error);
    
    // Send user-friendly error message
    await sendWhatsAppMessage(fromNumber, "🔧 Sorry, I'm having trouble processing your voice message right now. Please try again in a moment.");
    
    throw error;
  }
}

// ==========================================
// OPENAI WHISPER INTEGRATION
// ==========================================
async function transcribeAudio(audioBuffer) {
  try {
    // Create form data for OpenAI API
    const formData = new FormData();
    const audioBlob = new Blob([audioBuffer], { type: 'audio/ogg' });
    formData.append('file', audioBlob, 'audio.ogg');
    formData.append('model', 'whisper-1');
    formData.append('language', 'en'); // Auto-detect or specify
    formData.append('response_format', 'text');
    formData.append('temperature', '0.2'); // Lower temperature for better accuracy

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI Whisper API error: ${response.status} - ${errorText}`);
    }

    const transcription = await response.text();
    return transcription.trim();
    
  } catch (error) {
    console.error('❌ Whisper transcription error:', error);
    throw new Error(`Transcription failed: ${error.message}`);
  }
}

// ==========================================
// CLAUDE AI INTEGRATION
// ==========================================
async function getClaudeResponse(transcription, fromNumber, profileName) {
  try {
    const userName = profileName || 'there';
    
    const systemPrompt = `You are ODIA Agent Lexi, a friendly AI assistant for Nigerian businesses on WhatsApp. 

Key Guidelines:
- You communicate via text only (NO voice output)
- Be warm, helpful, and locally aware
- If they used Nigerian Pidgin, Yoruba, Hausa, or Igbo, respond naturally in the same style
- Keep responses concise but informative (under 200 words)
- Focus on business solutions, customer service, and practical help
- If asked about voice features, explain you understand voice but respond with text
- Always maintain a professional yet friendly Nigerian tone

The user ${userName} sent this voice message: "${transcription}"

Respond helpfully in text format.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 300,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: systemPrompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.content[0].text;
    
  } catch (error) {
    console.error('❌ Claude response error:', error);
    return "I heard what you said, but I'm having trouble thinking of a good response right now. Please try asking me again! 🤔";
  }
}

// ==========================================
// WHATSAPP MESSAGING
// ==========================================
async function sendWhatsAppMessage(toNumber, message) {
  try {
    const response = await twilioClient.messages.create({
      body: message,
      from: 'whatsapp:+14155238886', // Twilio sandbox number
      to: `whatsapp:${toNumber}`
    });

    console.log('✅ WhatsApp message sent, SID:', response.sid);
    return response;
    
  } catch (error) {
    console.error('❌ Failed to send WhatsApp message:', error);
    throw error;
  }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

// Format response for WhatsApp
function formatWhatsAppResponse(transcription, claudeResponse) {
  return `🎯 *I heard:* "${transcription}"

💬 *My response:*
${claudeResponse}

---
_Powered by ODIA AI - Voice to Text Assistant_`;
}

// Get help message
function getHelpMessage() {
  return `🤖 *ODIA Voice Assistant Help*

*How to use:*
🎤 Send me a voice message in any of these languages:
• English
• Nigerian Pidgin
• Yoruba
• Hausa  
• Igbo

*What I can help with:*
• Business questions
• Customer service
• General information
• Local recommendations

*Commands:*
• "help" - Show this message
• "upgrade" - Learn about premium features

Just record your voice and send! 🗣️`;
}

// Get voice instructions
function getVoiceInstructions() {
  return `🎤 *ODIA Voice Assistant*

Hello! I'm your AI assistant that understands Nigerian languages.

*To use me:*
📱 Hold the microphone button
🗣️ Speak clearly in English, Pidgin, Yoruba, Hausa, or Igbo
📤 Send the voice message
💬 I'll reply with helpful text

*Try saying:*
"How can you help my business?"
"Wetin you fit do for me?" (Pidgin)
"Bawo ni o ṣe le ran mi lowo?" (Yoruba)

Send a voice note to get started! 🎙️`;
}

// Get upgrade message
function getUpgradeMessage() {
  return `🚀 *ODIA Premium Features*

Upgrade for advanced capabilities:
• Unlimited voice messages
• Priority processing
• Business analytics
• Custom AI training
• WhatsApp Business API
• Multi-agent support

💰 *Pricing:*
• Starter: ₦5,000/month
• Pro: ₦15,000/month  
• Enterprise: Custom pricing

Contact: austynodia@gmail.com
Website: odia.dev

Ready to upgrade your business? 📈`;
}

// Check rate limits
async function checkRateLimit(userIdentifier, platform) {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_user_identifier: userIdentifier,
      p_platform: platform,
      p_max_requests: 20, // 20 messages per hour
      p_window_minutes: 60
    });

    if (error) {
      console.error('Rate limit check error:', error);
      return true; // Allow on error
    }

    return data;
  } catch (error) {
    console.error('Rate limit function error:', error);
    return true; // Allow on error
  }
}

// Check response cache
async function checkResponseCache(query) {
  try {
    const queryHash = crypto.createHash('md5').update(query.toLowerCase().trim()).digest('hex');
    
    const { data, error } = await supabase
      .from('cached_responses')
      .select('response_text')
      .eq('query_hash', queryHash)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      return null;
    }

    // Update hit count
    await supabase
      .from('cached_responses')
      .update({ 
        hit_count: supabase.rpc('increment', { hit_count: 1 }),
        updated_at: new Date().toISOString()
      })
      .eq('query_hash', queryHash);

    return data.response_text;
  } catch (error) {
    console.error('Cache check error:', error);
    return null;
  }
}

// Cache response
async function cacheResponse(query, response) {
  try {
    const queryHash = crypto.createHash('md5').update(query.toLowerCase().trim()).digest('hex');
    
    await supabase
      .from('cached_responses')
      .upsert({
        query_hash: queryHash,
        original_query: query,
        response_text: response,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      });
  } catch (error) {
    console.error('Cache storage error:', error);
  }
}

// Log voice session to Supabase
async function logVoiceSession({ messageSid, fromNumber, toNumber, profileName, transcription, claudeResponse, processingTime, audioUrl, audioSize }) {
  try {
    const { data, error } = await supabase
      .from('voice_sessions')
      .insert({
        platform: 'whatsapp',
        user_identifier: fromNumber,
        user_name: profileName,
        message_sid: messageSid,
        transcribed_text: transcription,
        claude_response: claudeResponse,
        processing_time_ms: processingTime,
        audio_url: audioUrl,
        audio_size_bytes: audioSize,
        total_cost_usd: estimateCost(transcription, claudeResponse, audioSize),
        whisper_cost_usd: estimateWhisperCost(audioSize),
        claude_cost_usd: estimateClaudeCost(transcription, claudeResponse)
      });

    if (error) {
      console.error('❌ Database logging error:', error);
    } else {
      console.log('✅ Session logged to database');
    }
    
  } catch (error) {
    console.error('❌ Database error:', error);
  }
}

// Log system errors
async function logSystemError(service, message, metadata = {}) {
  try {
    await supabase
      .from('system_logs')
      .insert({
        level: 'error',
        service: service,
        message: message,
        metadata: metadata
      });
  } catch (error) {
    console.error('Failed to log system error:', error);
  }
}

// Cost estimation functions
function estimateCost(transcription, response, audioSize) {
  return estimateWhisperCost(audioSize) + estimateClaudeCost(transcription, response);
}

function estimateWhisperCost(audioSize) {
  // Rough estimate: $0.006 per minute, assume 64kbps = ~480KB per minute
  const estimatedMinutes = Math.max(0.5, audioSize / (480 * 1024));
  return estimatedMinutes * 0.006;
}

function estimateClaudeCost(transcription, response) {
  // Rough estimate: $3 per million input tokens, $15 per million output tokens
  const inputTokens = Math.ceil(transcription.length / 4);
  const outputTokens = Math.ceil(response.length / 4);
  return (inputTokens * 3 / 1000000) + (outputTokens * 15 / 1000000);
}

// Validate Twilio signature for security
function validateTwilioSignature(params, signature) {
  try {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const url = 'https://odia.dev/api/webhook/whatsapp';
    
    const data = Object.keys(params)
      .sort()
      .reduce((acc, key) => acc + key + params[key], url);
    
    const hmac = crypto.createHmac('sha1', authToken);
    hmac.update(Buffer.from(data, 'utf-8'));
    const expectedSignature = `sha1=${hmac.digest('base64')}`;
    
    return signature === expectedSignature;
  } catch (error) {
    console.error('Signature validation error:', error);
    return false;
  }
}