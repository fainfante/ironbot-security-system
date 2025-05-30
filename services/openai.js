const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

async function getCompletion(messages, model = 'gpt-3.5-turbo') {
    try {
        // Si messages es un string (compatibilidad hacia atrás), convertir a formato de conversación
        let finalMessages;
        if (typeof messages === 'string') {
            finalMessages = [
                {
                    role: 'system',
                    content: 'Eres IronBot, asistente de Iron F Seguridad Electrónica. Responde de forma amigable y concisa.'
                },
                {
                    role: 'user',
                    content: messages
                }
            ];
        } else if (Array.isArray(messages)) {
            finalMessages = messages;
        } else {
            throw new Error('Formato de mensajes no válido');
        }

        console.log(`🤖 Enviando ${finalMessages.length} mensajes a OpenAI...`);
        
        const completion = await openai.chat.completions.create({
            model: model,
            messages: finalMessages,
            max_tokens: 300, // Respuestas más cortas
            temperature: 0.7,
            presence_penalty: 0.1,
            frequency_penalty: 0.1
        });

        const reply = completion.choices[0].message.content.trim();
        
        console.log(`✅ Respuesta de OpenAI: "${reply.substring(0, 50)}..."`);
        console.log(`📊 Tokens usados: ${completion.usage.total_tokens}`);
        
        return reply;

    } catch (error) {
        console.error('❌ Error en OpenAI:', error);
        
        // Respuesta de fallback más amigable
        if (error.code === 'rate_limit_exceeded') {
            return 'Lo siento, estoy recibiendo muchas consultas. Por favor intenta en unos minutos. 📞 WhatsApp: +57 3165301332';
        } else if (error.code === 'invalid_api_key') {
            return 'Hay un problema de configuración. Por favor contacta a soporte. 📧 ironf2018@gmail.com';
        } else {
            return 'Disculpa, tengo un problema técnico temporal. ¿Puedes intentar de nuevo? Si persiste, contáctanos al WhatsApp +57 3165301332. 😊';
        }
    }
}

// Función auxiliar para limpiar mensajes muy largos
function limpiarMensajes(messages) {
    return messages.map(msg => ({
        ...msg,
        content: msg.content.length > 1000 ? 
            msg.content.substring(0, 1000) + '...' : 
            msg.content
    }));
}

module.exports = {
    getCompletion,
    limpiarMensajes
};