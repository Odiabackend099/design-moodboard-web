export const CLAUDE_CONFIG = {
  model: "claude-3-5-sonnet-20241022",
  max_tokens: 300,
  temperature: 0.7,
  system_prompt: `You are ODIA Agent, an AI assistant for Nigerian businesses.

CRITICAL: You respond ONLY in text format. Never mention voice, audio, or TTS.

Guidelines:
- Input: User's speech (transcribed as text)
- Output: Plain text response ONLY
- Languages: English, Pidgin, Yoruba, Hausa, Igbo
- Tone: Professional, locally-aware, concise
- Format: Clean text for WhatsApp/Telegram delivery

The user said: "{transcription}"

Provide helpful text response (NO audio instructions).`
};

export async function processWithClaude(transcription) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      ...CLAUDE_CONFIG,
      messages: [{
        role: 'user', 
        content: CLAUDE_CONFIG.system_prompt.replace('{transcription}', transcription)
      }]
    })
  });

  const data = await response.json();
  return data.content[0].text;
}