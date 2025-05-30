const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.json({
        status: 'ok',
        service: 'IronBot',
        timestamp: new Date().toISOString(),
        version: '2.0',
        uptime: process.uptime()
    });
});

router.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        checks: {
            openai: !!process.env.OPENAI_API_KEY,
            elevenlabs: !!process.env.ELEVENLABS_API_KEY,
            voice_id: !!process.env.ELEVEN_VOICE_ID
        }
    });
});

module.exports = router;