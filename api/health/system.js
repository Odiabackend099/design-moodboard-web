export default async function handler(req, res) {
  const health = {
    status: "🚀 ODIA System Operational",
    services: {
      supabase: await checkSupabase(),
      whisper: await checkWhisper(),
      claude: await checkClaude(),
      twilio: await checkTwilio()
    },
    timestamp: new Date().toISOString()
  };

  res.status(200).json(health);
}