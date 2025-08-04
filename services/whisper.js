export async function transcribeWithWhisper(audioBuffer) {
  const formData = new FormData();
  formData.append('file', new Blob([audioBuffer]), 'audio.ogg');
  formData.append('model', 'whisper-1');
  formData.append('language', 'en');
  formData.append('response_format', 'text');
  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
    },
    body: formData
  });
  return await response.text();
}