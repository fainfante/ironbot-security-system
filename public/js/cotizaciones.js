// ========== SISTEMA DE COTIZACIONES IRONBOT ==========

class CotizacionManager {
    constructor() {
        this.productos = {};
        this.paquetes = {};
        this.initializeEventListeners();
        this.loadProductos();
    }

    // Cargar productos desde la API
    async loadProductos() {
        try {
            const response = await fetch('/api/cotizacion/productos');
            const data = await response.json();
            if (data.success) {
                this.productos = data.data;
            }
        } catch (error) {
            console.error('Error cargando productos:', error);
        }

        try {
            const response = await fetch('/api/cotizacion/paquetes');
            const data = await response.json();
            if (data.success) {
                this.paquetes = data.data;
            }
        } catch (error) {
            console.error('Error cargando paquetes:', error);
        }
    }

    // Inicializar event listeners
    initializeEventListeners() {
        // Crear botones de cotización después de que el DOM esté listo
        document.addEventListener('DOMContentLoaded', () => {
            this.createCotizacionButtons();
        });
    }

    // Crear botones de cotización rápida
    createCotizacionButtons() {
        const chatContainer = document.getElementById('chat-container');
        if (!chatContainer) return;

        // Verificar si ya existen los botones
        if (document.querySelector('.cotizacion-actions')) return;

        const buttonsContainer = document.createElement('div');
        buttonsContainer.className = 'cotizacion-actions';
        buttonsContainer.innerHTML = `
            <button class="btn-cotizacion" onclick="cotizacionManager.mostrarFormularioCotizacion()">
                💰 Cotización Rápida
            </button>
            <button class="btn-paquetes" onclick="cotizacionManager.mostrarPaquetes()">
                📦 Ver Paquetes
            </button>
        `;

        // Insertar después del primer mensaje del bot
        const firstBotMessage = chatContainer.querySelector('.bot-message');
        if (firstBotMessage) {
            firstBotMessage.after(buttonsContainer);
        }
    }

    // Mostrar formulario de cotización
    mostrarFormularioCotizacion() {
        const formulario = `
            <div class="cotizacion-form">
                <h3>🏠 Cotización Personalizada Iron F</h3>
                <p style="color: #666; margin-bottom: 20px; text-align: center;">
                    ⚠️ Cotización aproximada - Nuestro asesor confirmará el precio exacto
                </p>
                <form id="cotizacion-form">
                    <div class="form-group">
                        <label for="tipoPropiedad">🏢 ¿Qué tipo de lugar vas a proteger?</label>
                        <select id="tipoPropiedad" required>
                            <option value="">👆 Selecciona tu tipo de propiedad</option>
                            <option value="casa">🏠 Casa/Vivienda</option>
                            <option value="apartamento">🏢 Apartamento</option>
                            <option value="negocio">🏪 Negocio/Local Comercial</option>
                            <option value="empresa">🏢 Empresa/Oficina</option>
                            <option value="bodega">🏭 Bodega/Almacén</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="area">📏 ¿Cuántos metros cuadrados aproximados?</label>
                        <input type="number" id="area" min="10" max="10000" placeholder="Ej: 120" required>
                        <small>💡 Solo el área que quieres proteger</small>
                    </div>
                    
                    <div class="form-group">
                        <label for="camaras">🎥 ¿Cuántas cámaras necesitas?</label>
                        <select id="camaras">
                            <option value="">🤖 Déjanos recomendarte (automático)</option>
                            <option value="2">2 cámaras</option>
                            <option value="3">3 cámaras</option>
                            <option value="4">4 cámaras</option>
                            <option value="6">6 cámaras</option>
                            <option value="8">8 cámaras</option>
                            <option value="10">10+ cámaras</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="alarma">🚨 ¿Quieres sistema de alarma inalámbrica?</label>
                        <select id="alarma">
                            <option value="">❌ No, solo cámaras</option>
                            <option value="basica">📱 Básica - $680,000 (2 sensores + app celular)</option>
                            <option value="premium">🔔 Premium - $1,100,000 (4 sensores + sirena + app)</option>
                            <option value="empresarial">🏢 Empresarial - $1,700,000 (8 sensores + sirena + app)</option>
                        </select>
                        <small>💡 Todas incluyen control desde tu celular</small>
                    </div>
                    
                    <div class="form-group">
                        <label style="display: flex; align-items: center; gap: 10px;">
                            <input type="checkbox" id="controlAcceso"> 
                            🔐 Control de Acceso Biométrico (+$880,000)
                        </label>
                        <small>👆 Acceso por huella dactilar con app móvil</small>
                    </div>
                    
                    <div style="background: #e8f5e8; padding: 15px; border-radius: 10px; margin: 20px 0;">
                        <h4 style="color: #28a745; margin-bottom: 10px;">💳 Facilidades de Pago Iron F</h4>
                        <p style="margin: 5px 0;">✅ 50% al confirmar instalación</p>
                        <p style="margin: 5px 0;">✅ 50% al completar instalación</p>
                        </div>
                    
                    <button type="submit" class="btn-generar-cotizacion">
                        🎯 Generar Mi Cotización Aproximada
                    </button>
                </form>
            </div>
        `;

        this.addMessageToChat(formulario, 'bot');

        // Agregar event listener al formulario
        setTimeout(() => {
            const form = document.getElementById('cotizacion-form');
            if (form) {
                form.addEventListener('submit', (e) => this.procesarCotizacion(e));
            }
        }, 100);
    }

    // Mostrar paquetes disponibles
    async mostrarPaquetes() {
        try {
            const response = await fetch('/api/cotizacion/paquetes');
            const data = await response.json();
            
            if (!data.success) {
                throw new Error('Error cargando paquetes');
            }

            const paquetes = data.data;
            let paquetesHTML = `
                <div class="bot-message">
                    <h3 style="color: #1976d2; text-align: center; margin-bottom: 20px;">
                        📦 PAQUETES ESPECIALES IRON F
                    </h3>
                    <div class="paquetes-grid">
            `;

            Object.values(paquetes).forEach(paquete => {
                paquetesHTML += `
                    <div class="paquete-card" onclick="cotizacionManager.seleccionarPaquete('${Object.keys(paquetes).find(key => paquetes[key] === paquete)}')">
                        <h4>${paquete.nombre}</h4>
                        <div class="paquete-precio">${this.formatPrice(paquete.precio)}</div>
                        <div class="paquete-ahorro">💚 Ahorro: ${this.formatPrice(paquete.ahorro)}</div>
                        <div style="font-size: 0.9rem; color: #666; text-align: left;">
                            <strong>Incluye:</strong><br>
                            ${paquete.incluye.slice(0, 3).map(item => `• ${item}`).join('<br>')}
                            ${paquete.incluye.length > 3 ? '<br>• Y más...' : ''}
                        </div>
                    </div>
                `;
            });

            paquetesHTML += `
                    </div>
                    <p style="text-align: center; margin-top: 20px; color: #666;">
                        👆 Haz clic en cualquier paquete para más detalles
                    </p>
                </div>
            `;

            this.addMessageToChat(paquetesHTML, 'bot');

        } catch (error) {
            console.error('Error mostrando paquetes:', error);
            this.addMessageToChat('❌ Error cargando paquetes. Por favor intenta nuevamente.', 'bot');
        }
    }

    // Seleccionar un paquete específico
    async seleccionarPaquete(tipoPaquete) {
        try {
            const response = await fetch(`/api/cotizacion/paquetes/${tipoPaquete}`);
            const data = await response.json();
            
            if (!data.success) {
                throw new Error('Paquete no encontrado');
            }

            const paquete = data.data;
            const detalleHTML = `
                <div class="cotizacion-resultado">
                    <div class="cotizacion-header">
                        <h3>${paquete.nombre}</h3>
                        <p>${paquete.descripcion}</p>
                    </div>
                    
                    <div style="margin: 20px 0;">
                        <h4 style="color: #1976d2; margin-bottom: 15px;">✅ Incluye:</h4>
                        ${paquete.incluye.map(item => `
                            <div class="producto-item">
                                <span>• ${item}</span>
                            </div>
                        `).join('')}
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; margin: 20px 0;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span>Precio individual:</span>
                            <span style="text-decoration: line-through; color: #999;">${this.formatPrice(paquete.precio_individual)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span style="color: #28a745; font-weight: bold;">Precio paquete:</span>
                            <span style="color: #28a745; font-weight: bold;">${this.formatPrice(paquete.precio)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span style="color: #dc3545; font-weight: bold;">Tu ahorro:</span>
                            <span style="color: #dc3545; font-weight: bold;">${this.formatPrice(paquete.ahorro)}</span>
                        </div>
                    </div>
                    
                    <div class="total-final">
                        💰 PRECIO FINAL: ${this.formatPrice(paquete.precio)}
                    </div>
                    
                    <div style="text-align: center; margin-top: 20px;">
                        <button onclick="cotizacionManager.contactarPaquete('${tipoPaquete}')" 
                                style="background: #28a745; color: white; border: none; padding: 12px 30px; border-radius: 25px; cursor: pointer; font-weight: bold;">
                            📞 Solicitar este Paquete
                        </button>
                    </div>
                </div>
            `;

            this.addMessageToChat(detalleHTML, 'bot');

        } catch (error) {
            console.error('Error cargando paquete:', error);
            this.addMessageToChat('❌ Error cargando detalles del paquete.', 'bot');
        }
    }

    // Procesar formulario de cotización
    async procesarCotizacion(e) {
        e.preventDefault();

        const tipoPropiedad = document.getElementById('tipoPropiedad').value;
        const area = parseInt(document.getElementById('area').value);
        const numCamaras = document.getElementById('camaras').value;
        const alarma = document.getElementById('alarma').value;
        const controlAcceso = document.getElementById('controlAcceso').checked;

        if (!tipoPropiedad || !area) {
            alert('Por favor complete todos los campos requeridos');
            return;
        }

        // Ocultar formulario y mostrar carga
        e.target.style.display = 'none';
        this.addMessageToChat(`
            <div class="cotizacion-loading">
                ⏳ Generando su cotización personalizada...
            </div>
        `, 'bot');

        try {
            // Construir solicitud simplificada
            const solicitud = {
                tipoPropiedad,
                area,
                numCamaras: numCamaras || 'auto',
                alarma: alarma || null,
                controlAcceso,
                instalacion: 'premium'
            };

            console.log('📋 Solicitud de cotización:', solicitud);

            // Generar cotización localmente si la API falla
            const cotizacion = this.generarCotizacionLocal(solicitud);
            
            // Mostrar resultado
            setTimeout(() => {
                this.mostrarResultadoCotizacion(cotizacion, tipoPropiedad, area);
            }, 1500);

        } catch (error) {
            console.error('Error procesando cotización:', error);
            this.addMessageToChat(`
                <div style="background: #f8d7da; color: #721c24; padding: 15px; border-radius: 10px; margin: 15px 0;">
                    ❌ Error generando cotización. 
                    <br><br>
                    📞 Contacta directamente: +57 3181275647
                </div>
            `, 'bot');
        }
    }

    // Generar cotización local como fallback
    generarCotizacionLocal(solicitud) {
        const { tipoPropiedad, area, numCamaras, alarma, controlAcceso } = solicitud;
        
        let cotizacion = {
            items: [],
            subtotal: 0,
            descuentos: 0,
            total: 0
        };

        // Calcular cámaras recomendadas
        let camarasCalculadas = 0;
        if (numCamaras === 'auto') {
            if (area <= 100) camarasCalculadas = 3;
            else if (area <= 200) camarasCalculadas = 4;
            else if (area <= 300) camarasCalculadas = 6;
            else camarasCalculadas = 8;
        } else {
            camarasCalculadas = parseInt(numCamaras);
        }

        // Agregar cámaras
        const precioCamara = area > 200 ? 630000 : 490000; // 10MP para grandes, 6MP para pequeñas
        const nombreCamara = area > 200 ? 'Cámara Inalámbrica 10MP' : 'Cámara Inalámbrica 6MP';
        
        cotizacion.items.push({
            nombre: nombreCamara,
            cantidad: camarasCalculadas,
            precioUnitario: precioCamara,
            subtotal: precioCamara * camarasCalculadas
        });
        cotizacion.subtotal += precioCamara * camarasCalculadas;

        // DVR
        let precioDVR = 420000; // 4ch por defecto
        let nombreDVR = 'DVR 4 Canales';
        if (camarasCalculadas > 8) { precioDVR = 868000; nombreDVR = 'DVR 16 Canales'; }
        else if (camarasCalculadas > 4) { precioDVR = 588000; nombreDVR = 'DVR 8 Canales'; }
        
        cotizacion.items.push({
            nombre: nombreDVR,
            cantidad: 1,
            precioUnitario: precioDVR,
            subtotal: precioDVR
        });
        cotizacion.subtotal += precioDVR;

        // Disco duro
        const precioDisco = camarasCalculadas > 4 ? 350000 : 210000;
        const nombreDisco = camarasCalculadas > 4 ? 'Disco Duro 2TB' : 'Disco Duro 1TB';
        
        cotizacion.items.push({
            nombre: nombreDisco,
            cantidad: 1,
            precioUnitario: precioDisco,
            subtotal: precioDisco
        });
        cotizacion.subtotal += precioDisco;

        // Alarma
        if (alarma) {
            let precioAlarma = 952000; // básica
            let nombreAlarma = 'Alarma Básica';
            if (alarma === 'premium') { precioAlarma = 1540000; nombreAlarma = 'Alarma Premium'; }
            else if (alarma === 'empresarial') { precioAlarma = 2380000; nombreAlarma = 'Alarma Empresarial'; }
            
            cotizacion.items.push({
                nombre: nombreAlarma,
                cantidad: 1,
                precioUnitario: precioAlarma,
                subtotal: precioAlarma
            });
            cotizacion.subtotal += precioAlarma;
        }

        // Control de acceso
        if (controlAcceso) {
            cotizacion.items.push({
                nombre: 'Control Biométrico',
                cantidad: 1,
                precioUnitario: 1232000,
                subtotal: 1232000
            });
            cotizacion.subtotal += 1232000;
        }

        // Instalación
        const precioInstalacion = 210000 * (camarasCalculadas + (alarma ? 1 : 0) + (controlAcceso ? 1 : 0));
        cotizacion.items.push({
            nombre: `Instalación Premium (${camarasCalculadas + (alarma ? 1 : 0) + (controlAcceso ? 1 : 0)} puntos)`,
            cantidad: 1,
            precioUnitario: precioInstalacion,
            subtotal: precioInstalacion
        });
        cotizacion.subtotal += precioInstalacion;

        // Descuentos
        if (cotizacion.subtotal > 3000000) {
            cotizacion.descuentos = Math.round(cotizacion.subtotal * 0.1); // 10% descuento
        } else if (cotizacion.subtotal > 2000000) {
            cotizacion.descuentos = Math.round(cotizacion.subtotal * 0.05); // 5% descuento
        }

        cotizacion.total = cotizacion.subtotal - cotizacion.descuentos;

        return cotizacion;
    }

    // Construir objeto de cámaras según parámetros
    buildCamarasObject(numCamaras, tipoPropiedad, area) {
        const camaras = {};
        
        if (!numCamaras) {
            // Recomendación automática
            if (area <= 100) {
                camaras.analoga_4mp = 2;
                camaras.inalambrica_6mp = 1;
            } else if (area <= 200) {
                camaras.inalambrica_6mp = 2;
                camaras.analoga_4mp = 2;
            } else {
                camaras.inalambrica_10mp = 3;
                camaras.analoga_8mp = 3;
            }
        } else {
            const num = parseInt(numCamaras);
            if (num <= 4) {
                camaras.inalambrica_6mp = Math.ceil(num / 2);
                camaras.analoga_4mp = Math.floor(num / 2);
            } else {
                camaras.inalambrica_10mp = Math.ceil(num / 2);
                camaras.analoga_8mp = Math.floor(num / 2);
            }
        }
        
        return camaras;
    }

    // Mostrar resultado de cotización
    mostrarResultadoCotizacion(cotizacion, tipoPropiedad, area) {
        let resultadoHTML = `
            <div class="cotizacion-resultado">
                <div class="cotizacion-header">
                    <h3>💰 Tu Cotización Aproximada</h3>
                    <p>Para ${tipoPropiedad} de ${area}m²</p>
                    <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; border-radius: 8px; margin: 10px 0;">
                        <small style="color: #856404;">
                            ⚠️ <strong>Cotización aproximada</strong> - Nuestro asesor confirmará el precio exacto y personalizará según tus necesidades específicas
                        </small>
                    </div>
                </div>
                
                <div style="margin: 20px 0;">
                    <h4 style="color: #1976d2; margin-bottom: 15px;">📋 Productos Incluidos:</h4>
        `;

        cotizacion.items.forEach((item, index) => {
            resultadoHTML += `
                <div class="producto-item">
                    <span>${item.cantidad}x ${item.nombre}</span>
                    <span>${this.formatPrice(item.subtotal)}</span>
                </div>
            `;
        });

        resultadoHTML += `
                </div>
                
                <div style="background: #f8f9fa; padding: 15px; border-radius: 10px; margin: 20px 0;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span>Subtotal:</span>
                        <span>${this.formatPrice(cotizacion.subtotal)}</span>
                    </div>
        `;

        if (cotizacion.descuentos > 0) {
            resultadoHTML += `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span style="color: #28a745;">🎉 Descuentos aplicados:</span>
                        <span style="color: #28a745;">-${this.formatPrice(cotizacion.descuentos)}</span>
                    </div>
            `;
        }

        resultadoHTML += `
                </div>
                
                <div class="total-final">
                    💰 TOTAL APROXIMADO: ${this.formatPrice(cotizacion.total)}
                </div>
                
                <div style="background: #e8f5e8; padding: 20px; border-radius: 12px; margin: 20px 0;">
                    <h4 style="color: #28a745; margin-bottom: 15px;">💳 Facilidades de Pago Iron F</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; text-align: center;">
                        <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                            <div style="font-size: 1.5rem; color: #1976d2; margin-bottom: 5px;">1️⃣</div>
                            <strong>50% al confirmar</strong><br>
                            <span style="color: #28a745; font-weight: bold;">${this.formatPrice(cotizacion.total * 0.5)}</span>
                        </div>
                        <div style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
                            <div style="font-size: 1.5rem; color: #1976d2; margin-bottom: 5px;">2️⃣</div>
                            <strong>50% al instalar</strong><br>
                            <span style="color: #28a745; font-weight: bold;">${this.formatPrice(cotizacion.total * 0.5)}</span>
                        </div>
                    </div>
                    <p style="text-align: center; margin-top: 15px; color: #666;">
                        </p>
                </div>
                
                <div style="text-align: center; margin-top: 20px; font-size: 0.9rem; color: #666;">
                    ✅ Garantía: 1 año completo<br>
                    ⏱️ Instalación: 8 horas aproximadamente<br>
                    📱 Control total desde tu celular<br>
                    🛠️ Soporte técnico 24/7
                </div>
                
                <div style="text-align: center; margin-top: 25px;">
                    <button onclick="cotizacionManager.contactarCotizacion()" 
                            style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; border: none; padding: 15px 30px; border-radius: 25px; cursor: pointer; font-weight: bold; margin: 5px; font-size: 16px; box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);">
                        📞 Confirmar con Asesor
                    </button>
                    <button onclick="cotizacionManager.compartirCotizacion()" 
                            style="background: linear-gradient(135deg, #1976d2 0%, #42a5f5 100%); color: white; border: none; padding: 15px 30px; border-radius: 25px; cursor: pointer; font-weight: bold; margin: 5px; font-size: 16px; box-shadow: 0 4px 15px rgba(25, 118, 210, 0.3);">
                        📤 Compartir Cotización
                    </button>
                </div>
                
                <div style="background: #fff3cd; padding: 15px; border-radius: 10px; margin: 20px 0; text-align: center;">
                    <p style="color: #856404; margin: 0; font-weight: 500;">
                        🤝 <strong>Siguiente paso:</strong> Nuestro asesor especializado revisará tu caso, confirmará precios exactos y coordinará la visita técnica gratuita
                    </p>
                </div>
            </div>
        `;

        this.addMessageToChat(resultadoHTML, 'bot');
    }

    // Acciones de contacto
    contactarPaquete(tipoPaquete) {
        const paqueteNombre = tipoPaquete.replace('_', ' ').toUpperCase();
        const mensaje = `¡Hola Iron F! 👋 Me interesa mucho el paquete ${paqueteNombre} que vi en IronBot. ¿Podrían confirmarme el precio exacto y darme más información? ¡Gracias! 😊`;
        const whatsappURL = `https://wa.me/573181275647?text=${encodeURIComponent(mensaje)}`;
        window.open(whatsappURL, '_blank');
    }

    contactarCotizacion() {
        const mensaje = "¡Hola Iron F! 👋 Acabo de generar una cotización en IronBot y me encantaría que un asesor me confirme los precios exactos y coordine la visita técnica. ¡Muchas gracias! 😊";
        const whatsappURL = `https://wa.me/5731181275647?text=${encodeURIComponent(mensaje)}`;
        window.open(whatsappURL, '_blank');
    }

    compartirCotizacion() {
        // Implementar funcionalidad de compartir
        if (navigator.share) {
            navigator.share({
                title: 'Cotización Iron F Seguridad',
                text: 'Mira esta cotización personalizada de Iron F Seguridad Electrónica',
                url: window.location.href
            });
        } else {
            // Fallback para copiar al portapapeles
            navigator.clipboard.writeText(window.location.href).then(() => {
                alert('✅ Link copiado al portapapeles');
            });
        }
    }

    // Utilidades
    formatPrice(price) {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(price);
    }

    addMessageToChat(content, sender) {
        const chatContainer = document.getElementById('chat-container');
        if (!chatContainer) return;

        const messageDiv = document.createElement('div');
        messageDiv.className = `${sender}-message`;
        
        if (typeof content === 'string') {
            messageDiv.innerHTML = content;
        } else {
            messageDiv.appendChild(content);
        }

        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}

// Inicializar el manager de cotizaciones
const cotizacionManager = new CotizacionManager();