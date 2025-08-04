export default async function handler(req, res) {
  const { message } = req.body;
  if (message?.voice) {
    const audioBuffer = await getTelegramAudio(message.voice.file_id);
    const result = await processVoiceToText(audioBuffer);
    await sendTelegramText(message.chat.id, result.response);
  }
  res.status(200).json({ ok: true });
}