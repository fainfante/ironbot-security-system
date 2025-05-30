const express = require('express');
const router = express.Router();
const { getCompletion } = require('../services/openai');

// Almacenar conversaciones en memoria (en producción usar base de datos)
const conversaciones = new Map();

// Limpiar conversaciones viejas cada 30 minutos
setInterval(() => {
    const ahora = Date.now();
    for (const [sessionId, datos] of conversaciones.entries()) {
        // Eliminar conversaciones inactivas por más de 1 hora
        if (ahora - datos.ultimaActividad > 3600000) {
            conversaciones.delete(sessionId);
            console.log(`🧹 Conversación ${sessionId} limpiada por inactividad`);
        }
    }
}, 1800000); // 30 minutos

// Función para detectar el nombre en el mensaje
function detectarNombre(mensaje) {
    // Patrones comunes para detectar nombres
    const patrones = [
        /mi nombre es (\w+)/i,
        /me llamo (\w+)/i,
        /soy (\w+)/i,
        /yo soy (\w+)/i,
        /mi nombre:?\s*(\w+)/i,
        /nombre:?\s*(\w+)/i,
        /^(\w+)$/, // Solo el nombre
        /hola,?\s*soy\s*(\w+)/i,
        /buenas,?\s*soy\s*(\w+)/i,
        /^hola,?\s*(\w+)$/i,
        /^(\w{2,15})$/i // Nombre de 2-15 caracteres como respuesta directa
    ];

    // Limpiar el mensaje
    const mensajeLimpio = mensaje.trim();

    for (const patron of patrones) {
        const match = mensajeLimpio.match(patron);
        if (match && match[1]) {
            const nombreDetectado = match[1].toLowerCase();
            
            // Filtrar palabras comunes que no son nombres
            const palabrasExcluidas = [
                'hola', 'buenos', 'buenas', 'como', 'que', 'bien', 'mal', 'si', 'no',
                'gracias', 'por', 'favor', 'ayuda', 'info', 'precio', 'costo',
                'seguridad', 'camara', 'alarma', 'sistema', 'cotizacion'
            ];
            
            if (!palabrasExcluidas.includes(nombreDetectado) && nombreDetectado.length >= 2) {
                // Capitalizar la primera letra
                return nombreDetectado.charAt(0).toUpperCase() + nombreDetectado.slice(1).toLowerCase();
            }
        }
    }
    return null;
}

// Función para detectar saludo inicial
function esSaludoInicial(mensaje) {
    const saludos = [
        /^hola\s*$/i, /^hi\s*$/i, /^hey\s*$/i, /^buenas\s*$/i,
        /^buenos días\s*$/i, /^buenas tardes\s*$/i, /^buenas noches\s*$/i,
        /^qué tal\s*$/i, /^cómo está\s*$/i
    ];
    return saludos.some(patron => patron.test(mensaje.trim()));
}

router.post('/', async (req, res) => {
    try {
        const { message, systemPrompt, sessionId } = req.body;

        if (!message) {
            return res.status(400).json({ 
                success: false, 
                error: 'Mensaje requerido' 
            });
        }

        // Generar sessionId si no existe
        const finalSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Obtener o crear conversación
        if (!conversaciones.has(finalSessionId)) {
            conversaciones.set(finalSessionId, {
                mensajes: [],
                ultimaActividad: Date.now(),
                iniciada: Date.now(),
                nombreUsuario: null,
                contextoPersonal: {}
            });
            console.log(`💬 Nueva conversación iniciada: ${finalSessionId}`);
        }

        const conversacion = conversaciones.get(finalSessionId);
        conversacion.ultimaActividad = Date.now();

        // Detectar nombre del usuario
        const nombreDetectado = detectarNombre(message);
        if (nombreDetectado && !conversacion.nombreUsuario) {
            conversacion.nombreUsuario = nombreDetectado;
            console.log(`👤 Nombre detectado: ${nombreDetectado} en sesión ${finalSessionId}`);
            
            // Agregar contexto especial para el primer saludo con nombre
            conversacion.mensajes.push({
                role: 'system',
                content: `El usuario acaba de decir su nombre: ${nombreDetectado}. Salúdalo por su nombre de forma MUY amigable y entusiasta, luego pregúntale en qué puedes ayudarlo con seguridad. Respuesta súper corta.`
            });
        }

        // Si es el primer mensaje, agregar contexto del sistema
        if (conversacion.mensajes.length === 0 && systemPrompt) {
            // Personalizar el prompt si tenemos nombre
            let promptPersonalizado = systemPrompt;
            if (conversacion.nombreUsuario) {
                promptPersonalizado += `\n\nIMPORTANTE: El usuario se llama ${conversacion.nombreUsuario}. Dirígete a él/ella por su nombre de forma natural y amigable durante la conversación.`;
            }

            conversacion.mensajes.push({
                role: 'system',
                content: promptPersonalizado
            });
            
            console.log('📝 Prompt del sistema agregado:', promptPersonalizado.substring(0, 100) + '...');
        } else if (nombreDetectado && conversacion.mensajes.length > 0) {
            // Si detectamos el nombre en una conversación existente, actualizar el contexto
            if (conversacion.mensajes[0] && conversacion.mensajes[0].role === 'system') {
                conversacion.mensajes[0].content += `\n\nACTUALIZACIÓN: El usuario se llama ${nombreDetectado}. Usa su nombre de forma natural.`;
                console.log('📝 Prompt actualizado con nombre:', nombreDetectado);
            }
        }

        // Agregar mensaje del usuario
        conversacion.mensajes.push({
            role: 'user',
            content: message
        });

        // Mantener solo los últimos 20 mensajes para evitar usar demasiados tokens
        // Pero siempre conservar el mensaje del sistema (índice 0)
        if (conversacion.mensajes.length > 21) {
            const sistemaMsg = conversacion.mensajes[0]; // Conservar sistema
            const mensajesRecientes = conversacion.mensajes.slice(-20); // Últimos 20
            conversacion.mensajes = [sistemaMsg, ...mensajesRecientes];
        }

        // Preparar contexto adicional si es necesario
        let contextoAdicional = '';
        if (conversacion.nombreUsuario) {
            contextoAdicional = `Recuerda: Estás hablando con ${conversacion.nombreUsuario}. `;
        }

        // Si es un saludo y ya tenemos el nombre, personalizarlo
        if (esSaludoInicial(message) && conversacion.nombreUsuario && conversacion.mensajes.length > 2) {
            contextoAdicional += `${conversacion.nombreUsuario} te está saludando de nuevo, responde de forma natural sin volver a presentarte. `;
        }

        // Agregar contexto adicional como mensaje del sistema si es necesario
        if (contextoAdicional) {
            conversacion.mensajes.push({
                role: 'system',
                content: contextoAdicional + 'Continúa la conversación de forma natural.'
            });
        }

        console.log(`📝 Procesando mensaje de ${conversacion.nombreUsuario || 'usuario anónimo'}: "${message.substring(0, 50)}..."`);
        console.log(`📊 Historial: ${conversacion.mensajes.length} mensajes`);
        console.log(`🤖 Prompt del sistema activo: ${conversacion.mensajes[0]?.role === 'system' ? '✅' : '❌'}`);
        
        if (conversacion.mensajes[0]?.role === 'system') {
            console.log(`📋 Inicio del prompt: "${conversacion.mensajes[0].content.substring(0, 100)}..."`);
        };

        // Obtener respuesta de OpenAI con todo el contexto
        const reply = await getCompletion(conversacion.mensajes);

        // Agregar respuesta del asistente al historial
        conversacion.mensajes.push({
            role: 'assistant',
            content: reply
        });

        // Detectar si es una cotización para enviar flag adicional
        const esCotizacion = /cotizaci[óo]n|precio|costo|presupuesto|cuanto.*cuesta/i.test(message);

        res.json({
            reply,
            sessionId: finalSessionId,
            nombreUsuario: conversacion.nombreUsuario,
            esCotizacion,
            mensajesEnHistorial: conversacion.mensajes.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error en chat:', error);
        
        const fallbackMessage = "¡Hola! Soy IronBot de Iron F Seguridad Electrónica. " +
            "Estoy aquí para ayudarte con información sobre nuestros sistemas de seguridad. " +
            "📞 WhatsApp: +57 3165301332 | 📧 Email: ironf2018@gmail.com";

        res.json({
            reply: fallbackMessage,
            isError: true,
            timestamp: new Date().toISOString()
        });
    }
});

// Endpoint para obtener información de la sesión
router.get('/session/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const conversacion = conversaciones.get(sessionId);

    if (!conversacion) {
        return res.status(404).json({
            success: false,
            error: 'Sesión no encontrada'
        });
    }

    res.json({
        success: true,
        data: {
            sessionId,
            nombreUsuario: conversacion.nombreUsuario,
            mensajes: conversacion.mensajes.length,
            ultimaActividad: conversacion.ultimaActividad,
            iniciada: conversacion.iniciada
        }
    });
});

// Endpoint para limpiar sesión
router.delete('/session/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const existia = conversaciones.delete(sessionId);

    res.json({
        success: true,
        eliminada: existia,
        sessionId
    });
});

// Endpoint para obtener estadísticas
router.get('/stats', (req, res) => {
    const stats = {
        sesionesActivas: conversaciones.size,
        sesiones: []
    };

    for (const [sessionId, datos] of conversaciones.entries()) {
        stats.sesiones.push({
            sessionId: sessionId.substring(0, 15) + '...',
            nombreUsuario: datos.nombreUsuario || 'Anónimo',
            mensajes: datos.mensajes.length,
            ultimaActividad: new Date(datos.ultimaActividad).toLocaleTimeString(),
            duracion: Math.round((Date.now() - datos.iniciada) / 60000) + ' min'
        });
    }

    res.json(stats);
});

module.exports = router;