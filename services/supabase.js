import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qgqfiluokypqmloknxlh.supabase.co',
  process.env.SUPABASE_SERVICE_KEY
);

export async function logVoiceSession({
  platform,
  userId,
  transcription,
  response,
  processingTime
}) {
  const { data, error } = await supabase
    .from('voice_sessions')
    .insert({
      platform,
      user_identifier: userId,
      transcribed_text: transcription,
      claude_response: response,
      processing_time_ms: processingTime,
      created_at: new Date().toISOString()
    });

  if (error) console.error('Supabase error:', error);
  return data;
}