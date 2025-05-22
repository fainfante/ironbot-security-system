require('dotenv').config();
const express = require('express');
const path = require('path');
const app = express();

// Verificar variables de entorno
console.log('🔑 Variables de entorno:');
console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Configurada' : '❌ No configurada');
console.log('- ELEVENLABS_API_KEY:', process.env.ELEVENLABS_API_KEY ? '✅ Configurada' : '❌ No configurada');
console.log('- ELEVEN_VOICE_ID:', process.env.ELEVEN_VOICE_ID ? '✅ Configurado' : '❌ No configurado');

// JSON + logging
app.use(express.json());
app.use((req, res, next) => {
  const timestamp = new Date().toISOString().slice(11, 19);
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// Configuración explícita para archivos CSS
app.get('*.css', (req, res, next) => {
  res.type('text/css');
  next();
});

// Sirve front
app.use(express.static(path.join(__dirname, 'public')));

// API
app.use('/api/chat', require('./routes/chat'));
app.use('/api/status', require('./routes/status'));
app.use('/api/voice', require('./routes/voice'));

// Error handler
app.use(require('./utils/errorHandler'));

// Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
┌─────────────────────────────────────────┐
│                                         │
│   🤖 IronBot iniciado correctamente     │
│   🌐 Servidor en: http://localhost:${PORT}   │
│                                         │
└─────────────────────────────────────────┘
  `);
});