const express = require('express');
const router = express.Router();
const { textToSpeech } = require('../services/elevenlabs');

router.post('/', async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Falta el campo text' });
    }
    
    const timestamp = new Date().toISOString().slice(11, 19);
    console.log(`[${timestamp}] 📝 Solicitud de voz recibida (${text.length} caracteres)`);
    
    const mp3 = await textToSpeech(text);
    console.log(`[${timestamp}] ✅ Audio generado correctamente (${Math.round(mp3.length / 1024)} KB)`);
    
    res.set('Content-Type', 'audio/mpeg');
    res.send(mp3);
  } catch (e) {
    console.error('❌ Error en /api/voice:', e);
    next(e);
  }
});

module.exports = router;