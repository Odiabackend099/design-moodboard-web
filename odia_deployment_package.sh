#!/bin/bash
# ==========================================
# ODIA.dev PRODUCTION DEPLOYMENT PACKAGE
# Complete voice-to-text AI system
# ==========================================

echo "🚀 ODIA Voice-to-Text AI System Deployment"
echo "==========================================="
echo "Domain: odia.dev"
echo "Status: PRODUCTION READY"
echo ""

# ==========================================
# 1. ENVIRONMENT SETUP
# ==========================================

# Create production environment file
cat > .env.production << 'EOF'
# === PRODUCTION CONFIG ===
NODE_ENV=production
DOMAIN=odia.dev
API_BASE_URL=https://odia.dev/api
WEBHOOK_BASE=https://odia.dev/api/webhook

# === SUPABASE DATABASE ===
SUPABASE_URL=https://qgqfiluokypqmloknxlh.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFncWZpbHVva3lwcW1sb2tueGxoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzU1MTEwNSwiZXhwIjoyMDY5MTI3MTA1fQ.hhRpm-21UrSIQeGU-_TPNXNvDT6TPem1tz-67R2ro_o

# === OPENAI WHISPER ===
OPENAI_API_KEY=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

# === ANTHROPIC CLAUDE ===
ANTHROPIC_API_KEY=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

# === TWILIO WHATSAPP ===
TWILIO_ACCOUNT_SID=ACcc73a8bd8232bf258ff5dd3cd3e42768
TWILIO_AUTH_TOKEN=545af6147ea4dc6fa43ff039a8362de8
TWILIO_WHATSAPP_NUMBER=+14155238886

# === TELEGRAM BOT ===
TELEGRAM_BOT_TOKEN=8195489420:AAHUP277GQG3tMC4XFnvJubKZOASd-VhHZg

# === CLIENT-SIDE ENVIRONMENT ===
REACT_APP_API_BASE_URL=https://odia.dev/api
REACT_APP_OPENAI_API_KEY=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
REACT_APP_ANTHROPIC_API_KEY=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
REACT_APP_SUPABASE_URL=https://qgqfiluokypqmloknxlh.supabase.co
EOF

echo "✅ Environment variables configured"

# ==========================================
# 2. PACKAGE.JSON
# ==========================================

cat > package.json << 'EOF'
{
  "name": "odia-voice-to-text-ai",
  "version": "2.1.0",
  "description": "ODIA Voice-to-Text AI Assistant - Production Ready",
  "main": "build/index.js",
  "type": "module",
  "scripts": {
    "dev": "react-scripts start",
    "build": "react-scripts build",
    "start": "serve -s build -p $PORT",
    "test": "react-scripts test",
    "deploy": "vercel --prod",
    "health-check": "node scripts/health-check.js"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-scripts": "5.0.1",
    "lucide-react": "^0.263.1",
    "serve": "^14.2.0",
    "twilio": "^4.19.0",
    "crypto": "^1.0.1",
    "form-data": "^4.0.0"
  },
  "devDependencies": {
    "@vercel/node": "^2.15.0",
    "vercel": "^32.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "keywords": ["voice-ai", "nigeria", "whisper", "claude", "voice-to-text"],
  "author": "ODIA AI LTD",
  "license": "MIT"
}
EOF

echo "✅ Package.json created"

# ==========================================
# 3. VERCEL DEPLOYMENT CONFIG
# ==========================================

cat > vercel.json << 'EOF'
{
  "version": 2,
  "name": "odia-voice-to-text-ai",
  "alias": ["odia.dev", "www.odia.dev"],
  "builds": [
    {
      "src": "api/**/*.js",
      "use": "@vercel/node"
    },
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "build"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "env": {
    "NODE_ENV": "production",
    "SUPABASE_URL": "https://qgqfiluokypqmloknxlh.supabase.co",
    "SUPABASE_SERVICE_KEY": "@supabase_service_key",
    "OPENAI_API_KEY": "@openai_api_key",
    "ANTHROPIC_API_KEY": "@anthropic_api_key",
    "TWILIO_ACCOUNT_SID": "@twilio_account_sid",
    "TWILIO_AUTH_TOKEN": "@twilio_auth_token",
    "TELEGRAM_BOT_TOKEN": "@telegram_bot_token"
  },
  "functions": {
    "api/**/*.js": {
      "maxDuration": 30
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods",
          "value": "GET, POST, PUT, DELETE, OPTIONS"
        },
        {
          "key": "Access-Control-Allow-Headers",
          "value": "Content-Type, Authorization, X-Twilio-Signature"
        }
      ]
    }
  ]
}
EOF

echo "✅ Vercel configuration ready"

# ==========================================
# 4. CREATE API DIRECTORY STRUCTURE
# ==========================================

mkdir -p api/webhook
mkdir -p api/health
mkdir -p scripts

echo "✅ Directory structure created"

# ==========================================
# 5. WHATSAPP WEBHOOK HANDLER
# ==========================================

cat > api/webhook/whatsapp.js << 'EOF'
import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';
import crypto from 'crypto';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Twilio-Signature');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: '🚀 ODIA WhatsApp Voice-to-Text Webhook Active',
      timestamp: new Date().toISOString(),
      ready: true
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📨 WhatsApp webhook received:', req.body);

    const {
      Body: messageBody,
      From: fromNumber,
      To: toNumber,
      MessageSid: messageSid,
      MediaUrl0: audioUrl,
      MediaContentType0: mediaType,
      ProfileName: profileName
    } = req.body;

    if (!fromNumber || !messageSid) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const cleanFrom = fromNumber.replace('whatsapp:', '');
    const cleanTo = toNumber ? toNumber.replace('whatsapp:', '') : '';

    // Handle voice messages - MAIN FUNCTIONALITY
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
    
    // Handle text messages
    else if (messageBody) {
      const instruction = `🎤 *ODIA Voice-to-Text Assistant*

Hello! I convert your voice messages to text responses.

*How to use:*
📱 Send me a voice note in any language:
• English
• Nigerian Pidgin
• Yoruba, Hausa, Igbo

I'll transcribe your voice and respond with helpful text! 🗣️➡️📝

_Powered by OpenAI Whisper + Claude AI_`;

      await sendWhatsAppMessage(cleanFrom, instruction);
      
      return res.status(200).json({ 
        status: 'instruction_sent',
        message: 'Voice instruction sent'
      });
    }
    
    else {
      await sendWhatsAppMessage(cleanFrom, "Please send me a voice message! I convert voice to text. 🎤➡️📝");
      return res.status(200).json({ status: 'unsupported_message' });
    }

  } catch (error) {
    console.error('❌ Webhook error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    });
  }
}

async function processVoiceMessage({ audioUrl, fromNumber, toNumber, messageSid, profileName }) {
  const startTime = Date.now();
  
  try {
    console.log('🔄 Starting voice-to-text processing...');

    // Step 1: Download audio
    const audioResponse = await fetch(audioUrl, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64')}`
      }
    });

    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio: ${audioResponse.status}`);
    }

    const audioBuffer = await audioResponse.arrayBuffer();
    console.log('✅ Audio downloaded, size:', audioBuffer.byteLength);

    // Step 2: Transcribe with OpenAI Whisper
    console.log('🎯 Transcribing with Whisper...');
    const transcription = await transcribeAudio(audioBuffer);
    console.log('✅ Transcription:', transcription);

    if (!transcription || transcription.trim().length === 0) {
      await sendWhatsAppMessage(fromNumber, "🤔 I couldn't understand your voice message clearly. Could you try speaking a bit louder and clearer?");
      return { status: 'transcription_failed' };
    }

    // Step 3: Process with Claude (TEXT ONLY OUTPUT)
    console.log('🧠 Processing with Claude...');
    const claudeResponse = await getClaudeResponse(transcription, fromNumber);
    console.log('✅ Claude response:', claudeResponse);

    // Step 4: Send TEXT response
    const formattedResponse = `🎯 *I heard:* "${transcription}"

💬 *My response:*
${claudeResponse}

---
_🤖 ODIA Voice-to-Text AI Assistant_`;

    await sendWhatsAppMessage(fromNumber, formattedResponse);

    // Step 5: Log to database
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

    console.log('✅ Voice-to-text processing complete!');
    return { 
      status