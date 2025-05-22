const axios = require('axios');

const API_KEY = process.env.ELEVENLABS_API_KEY;
const VOICE_ID = process.env.ELEVEN_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';

async function textToSpeech(text) {
  if (!API_KEY) {
    throw new Error('ELEVENLABS_API_KEY no está configurada en .env');
  }
  
  console.log('🔊 Generando voz para:', text.substring(0, 50) + '...');
  
  try {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;
    const resp = await axios.post(
      url,
      { text, voice_settings: { stability: 0.5, similarity_boost: 0.75 } },
      {
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': API_KEY,
          'Accept': 'audio/mpeg'
        },
        responseType: 'arraybuffer'
      }
    );
    return resp.data;
  } catch (error) {
    console.error('❌ Error al llamar a ElevenLabs:', error.message);
    throw error;
  }
}

module.exports = { textToSpeech };