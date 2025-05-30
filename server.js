require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();

// Verificar variables de entorno críticas
const requiredEnvVars = ['OPENAI_API_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
    console.error('❌ Variables de entorno faltantes:', missingVars);
    console.error('💡 Configura estas variables antes de iniciar el servidor');
}

console.log('🔑 Variables de entorno:');
console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Configurada' : '❌ No configurada');
console.log('- ELEVENLABS_API_KEY:', process.env.ELEVENLABS_API_KEY ? '✅ Configurada' : '⚠️ Opcional');
console.log('- ELEVEN_VOICE_ID:', process.env.ELEVEN_VOICE_ID ? '✅ Configurado' : '⚠️ Opcional');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'development');

// Middleware básico
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging en desarrollo
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        const timestamp = new Date().toISOString().slice(11, 19);
        console.log(`[${timestamp}] ${req.method} ${req.url}`);
        next();
    });
}

// Configuración explícita para archivos CSS
app.get('*.css', (req, res, next) => {
    res.type('text/css');
    next();
});

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0
}));

// Verificar rutas con manejo de errores
console.log('🔍 Verificando rutas...');

try {
    const chatRoutes = require('./routes/chat');
    console.log('✅ Chat routes cargadas');
    app.use('/api/chat', chatRoutes);
} catch (error) {
    console.error('❌ Error cargando chat routes:', error.message);
}

try {
    const statusRoutes = require('./routes/status');
    console.log('✅ Status routes cargadas');
    app.use('/api/status', statusRoutes);
} catch (error) {
    console.error('❌ Error cargando status routes:', error.message);
}

try {
    const voiceRoutes = require('./routes/voice');
    console.log('✅ Voice routes cargadas');
    app.use('/api/voice', voiceRoutes);
} catch (error) {
    console.error('❌ Error cargando voice routes:', error.message);
}

try {
    const cotizacionRoutes = require('./routes/cotizacion');
    console.log('✅ Cotización routes cargadas');
    app.use('/api/cotizacion', cotizacionRoutes);
} catch (error) {
    console.error('❌ Error cargando cotización routes:', error.message);
}

console.log('🔍 Todas las rutas verificadas');

// Ruta de salud para monitoreo
app.get('/health', (req, res) => {
    const formattedResponse = aiResponse
    .replace(/\. /g, '.\n\n')
    .replace(/• /g, '\n• ')
    .replace(/\d+\./g, '\n$&')
    .replace(/--/g, '\n\n--');

res.json({ response: formattedResponse });
});

// Ruta principal - servir index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handler global
try {
    const errorHandler = require('./utils/errorHandler');
    app.use(errorHandler);
    console.log('✅ Error handler cargado');
} catch (error) {
    console.error('❌ Error cargando error handler:', error.message);
    // Error handler básico como fallback
    app.use((err, req, res, next) => {
        console.error('Error:', err);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    });
}

// Manejar rutas no encontradas
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Ruta no encontrada',
        path: req.originalUrl
    });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`
┌─────────────────────────────────────────┐
│                                         │
│   🤖 IronBot V2 iniciado correctamente  │
│   🌐 Servidor en: http://localhost:${PORT}   │
│   📊 Entorno: ${process.env.NODE_ENV || 'development'}              │
│                                         │
└─────────────────────────────────────────┘
    `);
});

// Manejo graceful de cierre del servidor
process.on('SIGTERM', () => {
    console.log('🔄 Cerrando servidor...');
    server.close(() => {
        console.log('✅ Servidor cerrado correctamente');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🔄 Cerrando servidor...');
    server.close(() => {
        console.log('✅ Servidor cerrado correctamente');
        process.exit(0);
    });
});

module.exports = app;
