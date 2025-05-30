const express = require('express');
const router = express.Router();

// Verificar configuración de ElevenLabs
router.get('/config', (req, res) => {
    try {
        const voice_id = process.env.ELEVEN_VOICE_ID;
        const api_key = process.env.ELEVENLABS_API_KEY;
        
        console.log('🔊 Configuración ElevenLabs:');
        console.log('- API Key:', api_key ? `✅ ${api_key.substring(0, 8)}...` : '❌ No configurado');
        console.log('- Voice ID:', voice_id ? `✅ ${voice_id}` : '❌ No configurado');
        
        res.json({
            success: true,
            available: !!(voice_id && api_key),
            voice_id: voice_id || null,
            hasApiKey: !!api_key
        });
    } catch (error) {
        console.error('❌ Error verificando ElevenLabs:', error);
        res.json({
            success: false,
            available: false,
            voice_id: null,
            error: error.message
        });
    }
});

// Generar audio usando ElevenLabs con reintentos
router.post('/speak', async (req, res) => {
    try {
        const { text, voice_id } = req.body;
        const finalVoiceId = voice_id || process.env.ELEVEN_VOICE_ID;
        
        if (!text) {
            return res.status(400).json({ 
                success: false, 
                error: 'Texto requerido' 
            });
        }

        if (!process.env.ELEVENLABS_API_KEY) {
            return res.status(500).json({ 
                success: false, 
                error: 'API Key de ElevenLabs no configurada' 
            });
        }

        if (!finalVoiceId) {
            return res.status(500).json({ 
                success: false, 
                error: 'Voice ID no configurado' 
            });
        }

        console.log(`🎤 Generando audio con voz: ${finalVoiceId}`);
        console.log(`📝 Texto: ${text.substring(0, 50)}...`);

        const fetch = require('node-fetch');
        
        // Función para hacer reintento
        const intentarGenerarAudio = async (intento = 1, maxIntentos = 3) => {
            try {
                const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${finalVoiceId}`, {
                    method: 'POST',
                    headers: {
                        'Accept': 'audio/mpeg',
                        'Content-Type': 'application/json',
                        'xi-api-key': process.env.ELEVENLABS_API_KEY
                    },
                    body: JSON.stringify({
                        text: text,
                        model_id: 'eleven_multilingual_v2',
                        voice_settings: {
                            stability: 0.5,
                            similarity_boost: 0.8,
                            style: 0.2,
                            use_speaker_boost: true
                        }
                    }),
                    timeout: 15000 // 15 segundos timeout
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error(`❌ Error ElevenLabs (intento ${intento}):`, response.status, errorText);
                    
                    // Si es error 500 o de red, intentar de nuevo
                    if ((response.status >= 500 || response.status === 429) && intento < maxIntentos) {
                        console.log(`🔄 Reintentando en ${intento * 2} segundos... (${intento}/${maxIntentos})`);
                        await new Promise(resolve => setTimeout(resolve, intento * 2000));
                        return intentarGenerarAudio(intento + 1, maxIntentos);
                    }
                    
                    throw new Error(`Error ${response.status}: ${errorText}`);
                }

                console.log(`✅ Audio generado exitosamente (intento ${intento})`);
                return response;

            } catch (error) {
                if (intento < maxIntentos && (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT')) {
                    console.log(`🔄 Error de red, reintentando... (${intento}/${maxIntentos})`);
                    await new Promise(resolve => setTimeout(resolve, intento * 2000));
                    return intentarGenerarAudio(intento + 1, maxIntentos);
                }
                throw error;
            }
        };

        const response = await intentarGenerarAudio();

        // Configurar headers para audio
        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Disposition': 'inline; filename="speech.mp3"',
            'Cache-Control': 'no-cache'
        });

        // Enviar el audio como stream
        response.body.pipe(res);

    } catch (error) {
        console.error('❌ Error final generando audio:', error.message);
        
        // Responder con error pero sin hacer fallar la aplicación
        res.status(500).json({
            success: false,
            error: 'Servicio de voz temporalmente no disponible',
            details: error.message,
            fallback: 'browser_tts'
        });
    }
});

// Listar voces disponibles (útil para debugging)
router.get('/voices', async (req, res) => {
    try {
        if (!process.env.ELEVENLABS_API_KEY) {
            return res.status(500).json({ 
                success: false, 
                error: 'API Key no configurada' 
            });
        }

        const fetch = require('node-fetch');
        
        const response = await fetch('https://api.elevenlabs.io/v1/voices', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'xi-api-key': process.env.ELEVENLABS_API_KEY
            }
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${await response.text()}`);
        }

        const voices = await response.json();
        
        res.json({
            success: true,
            voices: voices.voices,
            current_voice_id: process.env.ELEVEN_VOICE_ID
        });

    } catch (error) {
        console.error('Error obteniendo voces:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;