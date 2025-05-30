// ========== IRONBOT CHAT APPLICATION ==========

class IronBotChat {
    constructor() {
        this.chatContainer = document.getElementById('chat-container');
        this.messageInput = document.getElementById('message-input');
        this.chatForm = document.getElementById('chat-form');
        this.typingIndicator = document.getElementById('typing-indicator');
        this.speakingIndicator = document.getElementById('speaking-indicator');
        this.micBtn = document.getElementById('mic-btn');
        
        this.isListening = false;
        this.recognition = null;
        this.currentAudio = null;
        
        // Gestión de sesión y memoria
        this.sessionId = this.generateSessionId();
        this.nombreUsuario = null;
        this.conversacionIniciada = false;
        
        this.initializeChat();
        this.initializeVoice();
        this.initializeEventListeners();
        this.mostrarMensajeBienvenida();
    }

    generateSessionId() {
        // Intentar recuperar sessionId existente del localStorage
        let sessionId = localStorage.getItem('ironbot_session_id');
        
        // Si no existe o es muy viejo (más de 1 hora), crear uno nuevo
        const lastActivity = localStorage.getItem('ironbot_last_activity');
        const ahora = Date.now();
        
        if (!sessionId || !lastActivity || (ahora - parseInt(lastActivity)) > 3600000) {
            sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            localStorage.setItem('ironbot_session_id', sessionId);
            console.log('🆕 Nueva sesión creada:', sessionId);
        } else {
            console.log('♻️ Sesión recuperada:', sessionId);
        }
        
        // Actualizar última actividad
        localStorage.setItem('ironbot_last_activity', ahora.toString());
        
        return sessionId;
    }

    mostrarMensajeBienvenida() {
        // Solo mostrar bienvenida si no hay mensajes previos
        const mensajesExistentes = this.chatContainer.querySelectorAll('.bot-message, .user-message');
        if (mensajesExistentes.length === 0) {
            console.log('🎉 Mostrando mensaje de bienvenida...');
            
            setTimeout(() => {
                const mensajeBienvenida = `¡Hola! 👋 Soy IronBot de Iron F Seguridad Electrónica. 

¿Cuál es tu nombre? Me encantaría conocerte y ayudarte con información sobre nuestros sistemas de seguridad. 😊

💡 ¿O prefieres ir directo a ver nuestros paquetes?`;
                
                this.addMessage(mensajeBienvenida, 'bot');
                
                // Leer el mensaje de bienvenida
                setTimeout(() => {
                    this.speakMessage(mensajeBienvenida);
                }, 1000);
            }, 1000);
        } else {
            console.log('ℹ️ Ya hay mensajes existentes, no mostrando bienvenida');
        }
    }

    initializeChat() {
        // Configurar el prompt del sistema desde la variable global
        this.systemPrompt = window.DEFAULT_SYSTEM_PROMPT || `
            Eres IronBot, el asistente virtual de Iron F Seguridad Electrónica.
            Ayuda a los clientes con información sobre productos de seguridad.
            Mantén respuestas breves y profesionales.
        `;
    }

    initializeEventListeners() {
        // Envío de mensajes
        this.chatForm.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Enter para enviar (Shift+Enter para nueva línea)
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSubmit(e);
            }
        });

        // Botón de micrófono
        if (this.micBtn) {
            this.micBtn.addEventListener('click', () => this.toggleVoiceRecognition());
        }

        // Auto-resize del textarea
        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = this.messageInput.scrollHeight + 'px';
        });
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const message = this.messageInput.value.trim();
        if (!message) return;

        // Actualizar última actividad
        localStorage.setItem('ironbot_last_activity', Date.now().toString());

        // Agregar mensaje del usuario al chat
        this.addMessage(message, 'user');
        this.messageInput.value = '';
        this.messageInput.style.height = 'auto';

        // Mostrar indicador de escritura
        this.showTypingIndicator();

        try {
            // Enviar mensaje a la API con sessionId
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    systemPrompt: this.systemPrompt, // Forzar envío del prompt
                    sessionId: this.sessionId
                })
            });

            console.log('📤 Enviando prompt:', this.systemPrompt ? '✅' : '❌');
            console.log('📤 Longitud del prompt:', this.systemPrompt?.length || 0);

            const data = await response.json();
            
            // Ocultar indicador de escritura
            this.hideTypingIndicator();

            if (data.reply) {
                // Actualizar información de sesión
                if (data.sessionId) {
                    this.sessionId = data.sessionId;
                    localStorage.setItem('ironbot_session_id', this.sessionId);
                }

                // Actualizar nombre de usuario si se detectó
                if (data.nombreUsuario && !this.nombreUsuario) {
                    this.nombreUsuario = data.nombreUsuario;
                    console.log(`👤 ¡Hola ${this.nombreUsuario}! Tu nombre ha sido registrado.`);
                    
                    // Mostrar mensaje de confirmación sutil
                    setTimeout(() => {
                        this.mostrarNotificacionNombre(this.nombreUsuario);
                    }, 1000);
                }

                // Agregar respuesta del bot
                this.addMessage(data.reply, 'bot');

                // Si es una cotización, mostrar opciones adicionales
                if (data.esCotizacion) {
                    this.handleCotizacionResponse(data);
                }

                // Leer respuesta en voz alta si está habilitado
                this.speakMessage(data.reply);
                
                console.log(`📊 Mensajes en historial: ${data.mensajesEnHistorial || 'N/A'}`);
            } else {
                throw new Error('No se recibió respuesta del servidor');
            }

        } catch (error) {
            console.error('Error en chat:', error);
            this.hideTypingIndicator();
            
            // Mensaje de error fallback
            const errorMessage = `
                Lo siento${this.nombreUsuario ? `, ${this.nombreUsuario}` : ''}, hay un problema temporal con el servicio. 
                Puedes contactarnos directamente:
                📞 WhatsApp: +57 3165301332
                📧 Email: ironf2018@gmail.com
            `;
            this.addMessage(errorMessage, 'bot');
        }
    }

    mostrarNotificacionNombre(nombre) {
        const notificacion = document.createElement('div');
        notificacion.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #28a745, #20c997);
            color: white;
            padding: 12px 20px;
            border-radius: 25px;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
            z-index: 1000;
            opacity: 0;
            transform: translateX(100px);
            transition: all 0.3s ease;
        `;
        notificacion.innerHTML = `👤 ¡Hola ${nombre}! 🎉`;
        
        document.body.appendChild(notificacion);
        
        // Animar entrada
        setTimeout(() => {
            notificacion.style.opacity = '1';
            notificacion.style.transform = 'translateX(0)';
        }, 100);
        
        // Animar salida y remover
        setTimeout(() => {
            notificacion.style.opacity = '0';
            notificacion.style.transform = 'translateX(100px)';
            setTimeout(() => {
                if (notificacion.parentNode) {
                    notificacion.parentNode.removeChild(notificacion);
                }
            }, 300);
        }, 3000);
    }

    addMessage(content, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `${sender}-message`;
        
        // Procesar enlaces y formateo básico
        const formattedContent = this.formatMessage(content);
        messageDiv.innerHTML = formattedContent;

        this.chatContainer.appendChild(messageDiv);

        // Si es mensaje del bot, agregar botones de acción después de 1 segundo
        if (sender === 'bot') {
            setTimeout(() => {
                this.agregarBotonesAccion(messageDiv);
            }, 1000);
        }

        this.scrollToBottom();

        // Animación de entrada
        messageDiv.style.opacity = '0';
        messageDiv.style.transform = 'translateY(20px)';
        
        requestAnimationFrame(() => {
            messageDiv.style.transition = 'all 0.3s ease';
            messageDiv.style.opacity = '1';
            messageDiv.style.transform = 'translateY(0)';
        });
    }

    agregarBotonesAccion(messageDiv) {
        // No agregar botones si ya los tiene
        if (messageDiv.querySelector('.bot-actions')) return;

        const actionsHTML = `
            <div class="bot-actions" style="margin-top: 15px; display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;">
                <button onclick="cotizacionManager.mostrarFormularioCotizacion()" 
                        style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; font-size: 13px; font-weight: bold; box-shadow: 0 2px 8px rgba(40, 167, 69, 0.3);">
                    🎯 Cotización Rápida
                </button>
                <button onclick="cotizacionManager.mostrarPaquetes()" 
                        style="background: linear-gradient(135deg, #1976d2 0%, #42a5f5 100%); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; font-size: 13px; font-weight: bold; box-shadow: 0 2px 8px rgba(25, 118, 210, 0.3);">
                    📦 Ver Paquetes
                </button>
                <button onclick="window.open('https://wa.me/573165301332?text=¡Hola Iron F! 👋 Vengo del IronBot y me gustaría hablar con un asesor especializado 😊', '_blank')" 
                        style="background: linear-gradient(135deg, #25d366 0%, #128c7e 100%); color: white; border: none; padding: 8px 16px; border-radius: 20px; cursor: pointer; font-size: 13px; font-weight: bold; box-shadow: 0 2px 8px rgba(37, 211, 102, 0.3);">
                    🤝 Asesor WhatsApp
                </button>
            </div>
        `;
        
        messageDiv.insertAdjacentHTML('beforeend', actionsHTML);
    }

    formatMessage(content) {
        // Convertir URLs en enlaces clicables
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        content = content.replace(urlRegex, '<a href="$1" target="_blank" rel="noopener">$1</a>');
        
        // Convertir saltos de línea en <br>
        content = content.replace(/\n/g, '<br>');
        
        // Formatear texto en negrita (**texto**)
        content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        
        return content;
    }

    handleCotizacionResponse(cotizacionData) {
        // Agregar botones específicos de cotización después de la respuesta
        setTimeout(() => {
            const buttonsHTML = `
                <div class="cotizacion-actions" style="margin-top: 15px;">
                    <button class="btn-cotizacion" onclick="cotizacionManager.mostrarFormularioCotizacion()">
                        📝 Cotización Detallada
                    </button>
                    <button class="btn-paquetes" onclick="cotizacionManager.mostrarPaquetes()">
                        📦 Ver Paquetes
                    </button>
                </div>
            `;
            
            const lastBotMessage = this.chatContainer.querySelector('.bot-message:last-child');
            if (lastBotMessage) {
                const actionsDiv = document.createElement('div');
                actionsDiv.innerHTML = buttonsHTML;
                lastBotMessage.appendChild(actionsDiv.firstElementChild);
            }
        }, 500);
    }

    showTypingIndicator() {
        if (this.typingIndicator) {
            this.typingIndicator.style.display = 'flex';
            this.scrollToBottom();
        }
    }

    hideTypingIndicator() {
        if (this.typingIndicator) {
            this.typingIndicator.style.display = 'none';
        }
    }

    scrollToBottom() {
        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
    }

    // ========== FUNCIONALIDADES DE VOZ ==========

    initializeVoice() {
        // Verificar soporte para Web Speech API
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.lang = 'es-ES';

            this.recognition.onstart = () => {
                this.isListening = true;
                this.updateMicButton();
            };

            this.recognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                this.messageInput.value = transcript;
                this.messageInput.focus();
            };

            this.recognition.onend = () => {
                this.isListening = false;
                this.updateMicButton();
            };

            this.recognition.onerror = (event) => {
                console.error('Error de reconocimiento de voz:', event.error);
                this.isListening = false;
                this.updateMicButton();
            };

            // Mostrar botón de micrófono
            if (this.micBtn) {
                this.micBtn.style.display = 'flex';
            }
        }
    }

    toggleVoiceRecognition() {
        if (!this.recognition) return;

        if (this.isListening) {
            this.recognition.stop();
        } else {
            this.recognition.start();
        }
    }

    updateMicButton() {
        if (!this.micBtn) return;

        if (this.isListening) {
            this.micBtn.innerHTML = '🔴';
            this.micBtn.style.background = '#dc3545';
            this.micBtn.title = 'Detener grabación';
        } else {
            this.micBtn.innerHTML = '🎤';
            this.micBtn.style.background = '#28a745';
            this.micBtn.title = 'Iniciar grabación de voz';
        }
    }

    speakMessage(text) {
        // Verificar si hay configuración de ElevenLabs
        if (window.ELEVENLABS_CONFIG && window.ELEVENLABS_CONFIG.enabled) {
            this.speakWithElevenLabs(text);
        } else {
            this.speakWithBrowser(text);
        }
    }

    // Usar ElevenLabs para TTS de alta calidad
    async speakWithElevenLabs(text) {
        try {
            // Limpiar texto para TTS
            const cleanText = this.cleanTextForTTS(text);
            if (cleanText.length === 0) return;

            this.showSpeakingIndicator();

            const response = await fetch('/api/voice/speak', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: cleanText,
                    voice_id: window.ELEVENLABS_CONFIG?.voice_id || 'default'
                })
            });

            if (response.ok) {
                const audioBlob = await response.blob();
                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);
                
                audio.onended = () => {
                    this.hideSpeakingIndicator();
                    URL.revokeObjectURL(audioUrl);
                };

                audio.onerror = () => {
                    this.hideSpeakingIndicator();
                    console.error('Error reproduciendo audio de ElevenLabs');
                    // Fallback al TTS del navegador
                    this.speakWithBrowser(text);
                };

                await audio.play();
            } else {
                // Si ElevenLabs falla, usar TTS del navegador inmediatamente
                const errorData = await response.json().catch(() => ({}));
                console.warn('ElevenLabs no disponible:', errorData.error || 'Error desconocido');
                
                // Disparar evento para el indicador de estado
                window.dispatchEvent(new CustomEvent('voice-error', { 
                    detail: { error: errorData.error, fallback: 'browser' }
                }));
                
                this.hideSpeakingIndicator();
                this.speakWithBrowser(text);
            }
        } catch (error) {
            console.warn('Error con ElevenLabs TTS, usando fallback:', error.message);
            this.hideSpeakingIndicator();
            // Fallback al TTS del navegador
            this.speakWithBrowser(text);
        }
    }

    // TTS del navegador como fallback
    speakWithBrowser(text) {
        // Verificar si el navegador soporta síntesis de voz
        if (!('speechSynthesis' in window)) return;

        // Detener audio anterior si existe
        if (this.currentAudio) {
            speechSynthesis.cancel();
        }

        const cleanText = this.cleanTextForTTS(text);
        if (cleanText.length === 0) return;

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = 'es-ES';
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 0.8;

        utterance.onstart = () => {
            this.showSpeakingIndicator();
        };

        utterance.onend = () => {
            this.hideSpeakingIndicator();
            this.currentAudio = null;
        };

        utterance.onerror = () => {
            this.hideSpeakingIndicator();
            this.currentAudio = null;
        };

        this.currentAudio = utterance;
        speechSynthesis.speak(utterance);
    }

    // Limpiar texto para TTS
    cleanTextForTTS(text) {
        return text
            // Remover emojis y caracteres especiales
            .replace(/[📞📧🎯💰📦🏠✅⏱️🛡️🎤🔴🎉🏢🏪🏭🎥🚨🔐📏🔔💡👆💳🏦📱📷🌐📘🤖❌🤝👋😊]/g, '')
            // Remover URLs
            .replace(/https?:\/\/[^\s]+/g, '')
            // Remover markdown
            .replace(/\*\*(.*?)\*\*/g, '$1')
            // Remover caracteres especiales de precios
            .replace(/\$[\d,]+/g, (match) => match.replace(/[,$]/g, ' pesos '))
            // Limpiar espacios múltiples
            .replace(/\s+/g, ' ')
            .trim();
    }

    showSpeakingIndicator() {
        if (this.speakingIndicator) {
            this.speakingIndicator.style.display = 'flex';
        }
    }

    hideSpeakingIndicator() {
        if (this.speakingIndicator) {
            this.speakingIndicator.style.display = 'none';
        }
    }

    // ========== MÉTODOS PÚBLICOS ==========

    // Método para enviar mensajes programáticamente
    sendMessage(message) {
        this.messageInput.value = message;
        this.handleSubmit(new Event('submit'));
    }

    // Método para limpiar el chat
    clearChat() {
        const messages = this.chatContainer.querySelectorAll('.user-message, .bot-message');
        messages.forEach((msg, index) => {
            if (index > 0) { // Mantener el primer mensaje de bienvenida
                msg.remove();
            }
        });
    }

    // Método para cambiar el prompt del sistema
    updateSystemPrompt(newPrompt) {
        this.systemPrompt = newPrompt;
    }
}

// ========== FUNCIONES GLOBALES ==========

// Función para detectar indicadores de cotización en tiempo real
function detectarCotizacion(texto) {
    if (!window.COTIZACION_CONFIG) return false;
    
    const indicadores = window.COTIZACION_CONFIG.detectar_indicadores;
    return indicadores.some(regex => regex.test(texto));
}

// Función para sugerir mensajes rápidos
function sugerirMensajes() {
    const sugerencias = [
        "¿Cuánto cuesta un sistema de cámaras?",
        "Necesito una alarma para mi casa",
        "¿Qué paquetes manejan?",
        "Control de acceso biométrico",
        "Cotización para negocio de 200m²"
    ];
    
    return sugerencias;
}

// ========== INICIALIZACIÓN ==========

// Esperar a que el DOM esté completamente cargado
document.addEventListener('DOMContentLoaded', () => {
    // Limpiar cualquier mensaje previo si es una nueva sesión
    const chatContainer = document.getElementById('chat-container');
    if (chatContainer) {
        chatContainer.innerHTML = '';
    }
    
    // Inicializar la aplicación de chat
    window.ironBotChat = new IronBotChat();
    
    // Inicializar manager de cotizaciones si existe
    if (typeof CotizacionManager !== 'undefined') {
        window.cotizacionManager = new CotizacionManager();
    }
    
    console.log('🤖 IronBot iniciado correctamente');
    
    // Forzar mensaje de bienvenida si no aparece en 3 segundos
    setTimeout(() => {
        const mensajes = chatContainer.querySelectorAll('.bot-message, .user-message');
        if (mensajes.length === 0) {
            console.log('🚨 Forzando mensaje de bienvenida...');
            window.ironBotChat.mostrarMensajeBienvenida();
        }
    }, 3000);
});

// ========== UTILIDADES ==========

// Función para formatear precios
function formatearPrecio(precio) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(precio);
}

// Función para validar formularios
function validarFormulario(formId) {
    const form = document.getElementById(formId);
    if (!form) return false;
    
    const required = form.querySelectorAll('[required]');
    for (let field of required) {
        if (!field.value.trim()) {
            field.focus();
            return false;
        }
    }
    return true;
}

// Función para scroll suave
function scrollSuave(elemento) {
    elemento.scrollIntoView({
        behavior: 'smooth',
        block: 'end'
    });
}

// Manejo de errores globales
window.addEventListener('error', (e) => {
    console.error('Error global capturado:', e.error);
});

// Manejo de promesas rechazadas
window.addEventListener('unhandledrejection', (e) => {
    console.error('Promesa rechazada no manejada:', e.reason);
});

// Exportar funciones para uso global
window.IronBotUtils = {
    formatearPrecio,
    validarFormulario,
    scrollSuave,
    detectarCotizacion,
    sugerirMensajes
};