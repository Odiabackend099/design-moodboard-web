export default async function handler(req, res) {
  try {
    const audioData = req.body.audio;
    const transcription = await transcribeWithWhisper(audioData);
    const response = await processWithClaude(transcription);
    await logToSupabase({
      transcription,
      response,
      platform: req.body.platform,
      userId: req.body.userId
    });
    res.status(200).json({
      success: true,
      transcription,
      response,
      processingTime: Date.now() - startTime
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}