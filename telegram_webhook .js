// ==========================================
// ODIA Telegram Bot Voice Processing Webhook
// Production-ready voice-to-text handler
// File: api/webhook/telegram.js
// ==========================================

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// Initialize Supabase with production credentials
const supabase = createClient(
  process.env.SUPABASE_URL || 'https://qgqfiluokypqmloknxlh.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
);

// Telegram Bot Configuration
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '8195489420:AAHUP277GQG3tMC4XFnvJubKZOASd-VhHZg';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// API Keys
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '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';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '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';

export default async function handler(req, res) {
  // CORS headers for production
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');  
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Health check endpoint
  if (req.method === 'GET') {
    return res.status(200).json({
      status: '🚀 ODIA Telegram Bot Active',
      bot: '@Odia_dev_bot',
      service: 'telegram-voice-processor',
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
    console.log('📨 Telegram webhook received:', {
      update_id: req.body.update_id,
      message_type: req.body.message ? 'message' : 'callback_query'
    });

    const { message, callback_query, edited_message } = req.body;

    // Handle callback queries (button presses)
    if (callback_query) {
      await handleCallbackQuery(callback_query);
      return res.status(200).json({ ok: true });
    }

    // Handle edited messages (ignore for now)
    if (edited_message) {
      return res.status(200).json({ ok: true, ignored: 'edited_message' });
    }

    // Handle regular messages
    if (message) {
      await handleMessage(message);
      return res.status(200).json({ ok: true });
    }

    return res.status(200).json({ ok: true, ignored: 'unknown_update_type' });

  } catch (error) {
    console.error('❌ Telegram webhook error:', error);
    
    // Log error to Supabase
    await logSystemError('telegram-webhook', error.message, req.body);
    
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

// ==========================================
// MESSAGE HANDLING
// ==========================================
async function handleMessage(message) {
  const chatId = message.chat.id;
  const userId = message.from.id;
  const userName = message.from.first_name || 'User';
  const messageId = message.message_id;

  try {
    console.log(`📨 Processing message from ${userName} (${userId}) in chat ${chatId}`);

    // Check rate limits
    const rateLimitPassed = await checkRateLimit(userId.toString(), 'telegram');
    if (!rateLimitPassed) {
      await sendTelegramMessage(chatId, "⚠️ Too many requests. Please wait a moment before sending another message.", null, messageId);
      return;
    }

    // Handle different message types
    if (message.text === '/start') {
      await handleStartCommand(chatId, userName);
    } else if (message.text === '/help') {
      await handleHelpCommand(chatId);
    } else if (message.text === '/upgrade') {
      await handleUpgradeCommand(chatId);
    } else if (message.voice) {
      await processVoiceMessage(message);
    } else if (message.audio) {
      await processAudioMessage(message);
    } else if (message.text) {
      await handleTextMessage(message);
    } else {
      await sendTelegramMessage(chatId, "Please send me a voice message! I work best with voice input. 🎤", null, messageId);
    }

  } catch (error) {
    console.error('❌ Error handling message:', error);
    await sendTelegramMessage(chatId, "🔧 Sorry, I encountered an error processing your message. Please try again!");
  }
}

// ==========================================
// COMMAND HANDLERS
// ==========================================
async function handleStartCommand(chatId, userName) {
  const welcomeMessage = `🎤 *Welcome to ODIA Voice Assistant!*

Hi ${userName}! I'm your AI assistant that understands Nigerian languages perfectly.

*🌟 What makes me special:*
• I understand voice in English, Pidgin, Yoruba, Hausa & Igbo
• I respond with helpful text (no confusing voice replies)
• Built specifically for Nigerian businesses & individuals

*🎯 How to use me:*
1️⃣ Tap the microphone button 🎙️
2️⃣ Speak clearly in your preferred language
3️⃣ Send the voice message
4️⃣ Get instant text responses!

*💡 Try these examples:*
🗣️ "How can you help my business?"
🗣️ "Wetin you fit do for me?" (Pidgin)
🗣️ "Bawo ni o ṣe le ran mi lowo?" (Yoruba)

*Ready?* Send me your first voice message! 🚀

_Powered by ODIA AI - Nigeria's Voice AI Platform_`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '🆘 Help', callback_data: 'help' },
        { text: '🚀 Upgrade', callback_data: 'upgrade' }
      ],
      [
        { text: '🌐 Visit Website', url: 'https://odia.dev' }
      ]
    ]
  };

  await sendTelegramMessage(chatId, welcomeMessage, keyboard);
}

async function handleHelpCommand(chatId) {
  const helpText = `🆘 *ODIA Voice Assistant Help*

*🎤 Supported Voice Languages:*
• 🇬🇧 English
• 🇳🇬 Nigerian Pidgin
• 🗣️ Yoruba, Hausa, Igbo

*💼 What I can help with:*
• Business questions & advice
• Customer service automation
• General information & guidance
• Local recommendations
• Technology solutions

*📱 Commands:*
• /start - Welcome message
• /help - Show this help
• /upgrade - Premium features info

*🎯 Usage Tips:*
• Speak clearly into your phone mic
• Keep messages under 2 minutes
• I respond with text (easier to read & share)
• Works great for business discussions

*🔧 Having issues?*
Contact: austynodia@gmail.com
Website: odia.dev

Ready to try? Send a voice message! 🎙️`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '🚀 Try Premium', callback_data: 'upgrade' }
      ],
      [
        { text: '💬 Contact Support', url: 'mailto:austynodia@gmail.com' }
      ]
    ]
  };

  await sendTelegramMessage(chatId, helpText, keyboard);
}

async function handleUpgradeCommand(chatId) {
  const upgradeMessage = `🚀 *ODIA Premium Features*

*🎯 Current (Free):*
• 20 voice messages per day
• Basic Nigerian language support
• Standard response time

*⭐ Premium Upgrade:*
• ✅ Unlimited voice messages
• ✅ Priority processing (faster responses)
• ✅ Advanced business insights
• ✅ Custom AI training for your business
• ✅ WhatsApp Business integration
• ✅ Multi-agent support
• ✅ Analytics dashboard
• ✅ 24/7 priority support

*💰 Pricing:*
• **Starter:** ₦5,000/month (Small business)
• **Pro:** ₦15,000/month (Growing business)  
• **Enterprise:** Custom pricing (Large organization)

*🎁 Special Offer:*
Get 30% off your first 3 months!

*📞 Ready to upgrade?*
Contact: austynodia@gmail.com
WhatsApp: +234-XXX-XXXX
Website: odia.dev

Transform your business today! 📈`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '💬 Contact Sales', url: 'mailto:austynodia@gmail.com' },
        { text: '🌐 Learn More', url: 'https://odia.dev' }
      ]
    ]
  };

  await sendTelegramMessage(chatId, upgradeMessage, keyboard);
}

async function handleTextMessage(message) {
  const chatId = message.chat.id;
  const messageId = message.message_id;
  
  const textResponse = `📝 I see you sent text, but I work best with voice!

🎤 *Why voice is better:*
• More natural communication
• I understand Nigerian languages perfectly
• Faster than typing long messages
• Great for business discussions

*🎯 Just hold the microphone button and speak!*

I can understand:
🗣️ English, Pidgin, Yoruba, Hausa, Igbo

Try saying: _"Hello, how can you help my business?"_

Send a voice note now! 🎙️`;

  const keyboard = {
    inline_keyboard: [
      [
        { text: '🆘 Need Help?', callback_data: 'help' }
      ]
    ]
  };

  await sendTelegramMessage(chatId, textResponse, keyboard, messageId);
}

// ==========================================
// VOICE PROCESSING
// ==========================================
async function processVoiceMessage(message) {
  const chatId = message.chat.id;
  const startTime = Date.now();

  try {
    const userName = message.from.first_name || 'User';
    console.log(`🎤 Processing voice message from ${userName}`);

    // Send processing message
    const processingMsg = await sendTelegramMessage(chatId, "🎧 Processing your voice message...");

    // Get file information from Telegram
    const fileId = message.voice.file_id;
    const duration = message.voice.duration;

    // Check duration limits (2 minutes max)
    if (duration > 120) {
      await editTelegramMessage(chatId, processingMsg.message_id, "⚠️ Voice message too long. Please keep it under 2 minutes.");
      return;
    }

    const fileInfo = await getTelegramFile(fileId);
    if (!fileInfo.ok) {
      throw new Error('Failed to get file info from Telegram');
    }

    const filePath = fileInfo.result.file_path;
    const fileUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;

    // Download audio file
    console.log('📥 Downloading audio from Telegram...');
    const audioResponse = await fetch(fileUrl);
    if (!audioResponse.ok) {
      throw new Error('Failed to download audio file');
    }

    const audioBuffer = await audioResponse.arrayBuffer();
    console.log('✅ Audio downloaded, size:', audioBuffer.byteLength, 'bytes');

    // Update processing message
    await editTelegramMessage(chatId, processingMsg.message_id, "🎯 Transcribing your voice...");

    // Transcribe with OpenAI Whisper
    const transcription = await transcribeAudio(audioBuffer);
    console.log('✅ Transcription:', transcription);

    if (!transcription || transcription.trim().length === 0) {
      await editTelegramMessage(chatId, processingMsg.message_id, "🤔 I couldn't understand your voice message clearly. Could you try speaking a bit louder and clearer?");
      return;
    }

    // Update processing message
    await editTelegramMessage(chatId, processingMsg.message_id, "🧠 Processing with AI...");

    // Check cache first
    const cachedResponse = await checkResponseCache(transcription);
    let claudeResponse;

    if (cachedResponse) {
      console.log('🎯 Using cached response');
      claudeResponse = cachedResponse;
    } else {
      // Get response from Claude
      claudeResponse = await getClaudeResponse(transcription, message.from);
      console.log('✅ Claude response:', claudeResponse);

      // Cache the response
      await cacheResponse(transcription, claudeResponse);
    }

    // Format and send final response
    const finalResponse = formatTelegramResponse(transcription, claudeResponse);
    await editTelegramMessage(chatId, processingMsg.message_id, finalResponse);

    // Log to database
    const processingTime = Date.now() - startTime;
    await logVoiceSession({
      platform: 'telegram',
      userId: message.from.id,
      userName: message.from.first_name,
      chatId: chatId,
      transcription,
      claudeResponse,
      processingTime,
      fileId,
      audioSize: audioBuffer.byteLength,
      duration
    });

    console.log('✅ Telegram voice processing complete!');

  } catch (error) {
    console.error('❌ Voice processing error:', error);
    await sendTelegramMessage(chatId, "🔧 Sorry, I had trouble processing your voice message. Please try again or contact support if the problem persists.");
  }
}

// Handle audio files (similar to voice but different format)
async function processAudioMessage(message) {
  // Similar logic to voice messages but for audio files
  await processVoiceMessage({
    ...message,
    voice: {
      file_id: message.audio.file_id,
      duration: message.audio.duration
    }
  });
}

// ==========================================
// AI PROCESSING
// ==========================================
async function transcribeAudio(audioBuffer) {
  try {
    const formData = new FormData();
    const audioBlob = new Blob([audioBuffer], { type: 'audio/ogg' });
    formData.append('file', audioBlob, 'audio.ogg');
    formData.append('model', 'whisper-1');
    formData.append('language', 'en'); // Auto-detect
    formData.append('response_format', 'text');
    formData.append('temperature', '0.2');

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

async function getClaudeResponse(transcription, fromUser) {
  try {
    const userName = fromUser.first_name || 'there';
    
    const systemPrompt = `You are ODIA Agent, a helpful AI assistant for Nigerians on Telegram.

Key Guidelines:
- You communicate via text only (NO voice output ever)
- Be warm, friendly, and locally aware
- If they used Nigerian Pidgin, Yoruba, Hausa, or Igbo, respond naturally in the same style
- Keep responses concise but informative (under 250 words)
- Focus on being helpful with business, personal, or general questions
- Always maintain a professional yet friendly Nigerian tone
- If asked about voice features, clarify you understand voice but respond with text only

The user ${userName} sent this voice message: "${transcription}"

Respond helpfully in text format only.`;

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
    return "I heard what you said, but I'm having trouble thinking right now. Try asking me again! 🤔";
  }
}

// ==========================================
// TELEGRAM API HELPERS
// ==========================================
async function sendTelegramMessage(chatId, text, replyMarkup = null, replyToMessageId = null) {
  try {
    const payload = {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    };

    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    if (replyToMessageId) {
      payload.reply_to_message_id = replyToMessageId;
    }

    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Telegram API error: ${response.status} - ${errorText}`);
    }

    return await response.json();
    
  } catch (error) {
    console.error('❌ Failed to send Telegram message:', error);
    throw error;
  }
}

async function editTelegramMessage(chatId, messageId, text, replyMarkup = null) {
  try {
    const payload = {
      chat_id: chatId,
      message_id: messageId,
      text: text,
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    };

    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }

    const response = await fetch(`${TELEGRAM_API_URL}/editMessageText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`Edit message failed: ${response.status} - ${errorText}`);
      // Don't throw error for edit failures, just log
    }

    return await response.json();
    
  } catch (error) {
    console.warn('Edit message error:', error);
    // Don't throw for edit errors
  }
}

async function getTelegramFile(fileId) {
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/getFile?file_id=${fileId}`);
    return await response.json();
  } catch (error) {
    console.error('❌ Failed to get Telegram file:', error);
    throw error;
  }
}

// ==========================================
// CALLBACK QUERY HANDLER
// ==========================================
async function handleCallbackQuery(callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  const queryId = callbackQuery.id;

  // Acknowledge the callback query
  await fetch(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      callback_query_id: queryId,
      text: 'Processing...'
    })
  });

  // Handle different callback actions
  if (data === 'help') {
    await handleHelpCommand(chatId);
  } else if (data === 'upgrade') {
    await handleUpgradeCommand(chatId);
  }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================
function formatTelegramResponse(transcription, claudeResponse) {
  return `🎯 *I heard:* "${transcription}"

💬 *My response:*
${claudeResponse}

---
_🤖 ODIA AI - Voice to Text Assistant_
_Try /upgrade for premium features_`;
}

// Rate limiting check
async function checkRateLimit(userIdentifier, platform) {
  try {
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_user_identifier: userIdentifier,
      p_platform: platform,
      p_max_requests: 30, // 30 messages per hour for Telegram
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

// Cache functions
async function checkResponseCache(query) {
  try {
    const queryHash = crypto.createHash('md5').update(query.toLowerCase().trim()).digest('hex');
    
    const { data, error } = await supabase
      .from('cached_responses