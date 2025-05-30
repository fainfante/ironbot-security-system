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

// DEBUGGING - Verificar cada ruta individualmente
console.log('🔍 Verificando rutas...');

try {
    const chatRoutes = require('./routes/chat');
    console.log('✅ Chat routes:', typeof chatRoutes);
    app.use('/api/chat', chatRoutes);
} catch (error) {
    console.error('❌ Error en chat routes:', error.message);
}

try {
    const statusRoutes = require('./routes/status');
    console.log('✅ Status routes:', typeof statusRoutes);
    app.use('/api/status', statusRoutes);
} catch (error) {
    console.error('❌ Error en status routes:', error.message);
}

try {
    const voiceRoutes = require('./routes/voice');
    console.log('✅ Voice routes:', typeof voiceRoutes);
    app.use('/api/voice', voiceRoutes);
} catch (error) {
    console.error('❌ Error en voice routes:', error.message);
}

try {
    const cotizacionRoutes = require('./routes/cotizacion');
    console.log('✅ Cotización routes:', typeof cotizacionRoutes);
    app.use('/api/cotizacion', cotizacionRoutes);
} catch (error) {
    console.error('❌ Error en cotización routes:', error.message);
}

console.log('🔍 Todas las rutas verificadas');

// Error handler
try {
    app.use(require('./utils/errorHandler'));
    console.log('✅ Error handler cargado');
} catch (error) {
    console.error('❌ Error en error handler:', error.message);
}

// Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`
┌─────────────────────────────────────────┐
│                                         │
│   🤖 IronBot iniciado correctamente     │
│   🌐 Servidor en: http://localhost:${PORT}   │
│                                         │
└─────────────────────────────────────────┘
  `);
<<<<<<< HEAD
  // DEBUGGING TEMPORAL - Agregar al final del server.js
console.log('🔍 Debugging variables de entorno:');
console.log('- ELEVEN_VOICE_ID completo:', process.env.ELEVEN_VOICE_ID);
console.log('- ELEVENLABS_API_KEY (primeros 8 chars):', process.env.ELEVENLABS_API_KEY?.substring(0, 8));
});
=======
});
>>>>>>> 38234b928f964f8fe9ae870dc1b35268020ef7bf
