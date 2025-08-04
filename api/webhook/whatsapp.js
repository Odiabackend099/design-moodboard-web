export default async function handler(req, res) {
  const { MediaUrl0: audioUrl, From: fromNumber } = req.body;
  if (audioUrl) {
    const audioBuffer = await downloadAudio(audioUrl);
    const result = await processVoiceToText(audioBuffer);
    await sendWhatsAppText(fromNumber, result.response);
    return res.status(200).json({ success: true });
  }
  res.status(200).json({ message: "Send voice note for AI assistance" });
}