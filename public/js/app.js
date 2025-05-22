document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 IronBot UI inicializado');
  
  // Elementos DOM
  const form = document.getElementById('chat-form');
  const input = document.getElementById('message-input');
  const chat = document.getElementById('chat-container');
  const typing = document.getElementById('typing-indicator');
  const speaking = document.getElementById('speaking-indicator');
  const micBtn = document.getElementById('mic-btn');
  const PROMPT = DEFAULT_SYSTEM_PROMPT;

  // Reconocimiento de voz
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SR) {
    const recog = new SR();
    recog.lang = 'es-ES';
    recog.interimResults = false;
    recog.maxAlternatives = 1;
    let listening = false;
    micBtn.style.display = 'inline-block';

    micBtn.onclick = () => {
      if (listening) return;
      recog.start();
    };

    recog.onstart = () => {
      listening = true;
      micBtn.disabled = true;
      micBtn.textContent = '🎙️';
      console.log('🎤 Escuchando...');
    };
    
    recog.onresult = e => {
      const transcript = e.results[0][0].transcript;
      input.value = transcript;
      console.log('🎤 Transcripción:', transcript);
    };
    
    recog.onend = () => {
      listening = false;
      micBtn.disabled = false;
      micBtn.textContent = '🎤';
      console.log('🎤 Fin de escucha');
    };
    
    recog.onerror = e => {
      listening = false;
      micBtn.disabled = false;
      micBtn.textContent = '🎤';
      console.error('🎤 Error:', e.error);
    };
  } else {
    console.warn('⚠️ SpeechRecognition no soportado en este navegador');
  }

  // Envío de mensajes
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    
    // Mostrar mensaje del usuario
    append(text, 'user');
    input.value = '';
    input.focus();
    
    // Mostrar indicador de escritura
    typing.style.display = 'flex';
    
    try {
      console.log('📤 Enviando mensaje:', text);
      
      // Enviar al backend
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, systemPrompt: PROMPT })
      });
      
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
      
      // Procesar respuesta
      const data = await res.json();
      console.log('📥 Respuesta recibida');
      
      // Mostrar respuesta
      append(data.reply, 'bot');
      
      // Generar y reproducir voz
      try {
        console.log('🔊 Solicitando voz...');
        
        const voiceRes = await fetch('/api/voice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: data.reply })
        });
        
        if (!voiceRes.ok) {
          throw new Error(`Error de voz ${voiceRes.status}`);
        }
        
        const audioBuffer = await voiceRes.arrayBuffer();
        const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        
        // Mostrar indicador de voz
        speaking.style.display = 'flex';
        console.log('🔊 Reproduciendo audio...');
        
        // Eventos de audio
        audio.onended = () => {
          speaking.style.display = 'none';
          console.log('🔊 Audio finalizado');
        };
        
        audio.onpause = () => {
          speaking.style.display = 'none';
        };
        
        audio.onerror = () => {
          speaking.style.display = 'none';
          console.error('❌ Error al reproducir audio');
        };
        
        await audio.play();
      } catch (voiceErr) {
        console.error('❌ Error de voz:', voiceErr);
      }
      
    } catch (err) {
      console.error('❌ Error:', err);
      append('⚠️ Ha ocurrido un error. Por favor, inténtalo de nuevo.', 'bot');
    } finally {
      typing.style.display = 'none';
    }
  });

  // Funciones auxiliares
  function linkify(text) {
    return text.replace(
      /(https?:\/\/[^\s]+)/g, 
      url => `<a href="${url}" target="_blank" rel="noopener">${url}</a>`
    );
  }
  
  function append(message, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = sender === 'user' ? 'user-message' : 'bot-message';
    messageDiv.innerHTML = linkify(message);
    chat.appendChild(messageDiv);
    
    // Scroll al último mensaje
    chat.scrollTop = chat.scrollHeight;
  }
});