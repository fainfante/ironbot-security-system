const fs = require('fs');
const path = require('path');

class CotizadorService {
    constructor() {
        this.productos = require('../data/productos.json');
        this.matrices = require('../data/matrices.json');
    }

    // Detectar si el mensaje es una solicitud de cotización
    detectarSolicitudCotizacion(mensaje) {
        const palabrasClave = this.matrices.palabras_clave.solicitud_cotizacion;
        const mensajeLower = mensaje.toLowerCase();
        
        return palabrasClave.some(palabra => mensajeLower.includes(palabra));
    }

    // Extraer información del mensaje
    extraerInformacion(mensaje) {
        const mensajeLower = mensaje.toLowerCase();
        const info = {
            tipoPropiedad: null,
            area: null,
            productos: [],
            presupuesto: null
        };

        // Detectar tipo de propiedad
        for (const [tipo, palabras] of Object.entries(this.matrices.palabras_clave.tipos_propiedad)) {
            if (palabras.some(palabra => mensajeLower.includes(palabra))) {
                info.tipoPropiedad = tipo;
                break;
            }
        }

        // Extraer área (buscar números seguidos de m2, metros, etc.)
        const areaMatch = mensajeLower.match(/(\d+)\s*(m2|metros|metro)/);
        if (areaMatch) {
            info.area = parseInt(areaMatch[1]);
        }

        // Extraer presupuesto
        const presupuestoMatch = mensajeLower.match(/presupuesto.*?(\d+(?:\.\d+)?)/);
        if (presupuestoMatch) {
            info.presupuesto = parseFloat(presupuestoMatch[1]);
        }

        return info;
    }

    // Generar recomendación basada en información
    generarRecomendacion(info) {
        const tipoPropiedad = info.tipoPropiedad || 'casa';
        const area = info.area || 100;
        
        const recomendaciones = this.matrices.reglas_cotizacion.recomendaciones_por_tipo[tipoPropiedad];
        
        if (!recomendaciones) {
            return this.generarRecomendacionBasica();
        }

        // Encontrar categoría de área
        let categoriaArea = null;
        for (const [categoria, config] of Object.entries(recomendaciones)) {
            if (area >= config.metros_min && area <= config.metros_max) {
                categoriaArea = config;
                break;
            }
        }

        if (!categoriaArea) {
            categoriaArea = Object.values(recomendaciones)[0]; // Default a la primera
        }

        return {
            tipoPropiedad,
            area,
            camarasRecomendadas: categoriaArea.camaras_recomendadas,
            productos: categoriaArea.productos,
            paqueteSugerido: categoriaArea.paquete_sugerido
        };
    }

    // Calcular cotización personalizada
    calcularCotizacion(solicitud) {
        const {
            camaras = {},
            alarma = null,
            controlAcceso = false,
            instalacion = 'basica'
        } = solicitud;

        let cotizacion = {
            items: [],
            subtotal: 0,
            descuentos: 0,
            total: 0,
            ahorro: 0
        };

        // Agregar cámaras
        let totalCamaras = 0;
        for (const [tipo, cantidad] of Object.entries(camaras)) {
            if (cantidad > 0) {
                const producto = this.buscarProducto(tipo);
                if (producto) {
                    const item = {
                        nombre: producto.nombre,
                        cantidad: cantidad,
                        precioUnitario: producto.precio,
                        subtotal: producto.precio * cantidad
                    };
                    cotizacion.items.push(item);
                    cotizacion.subtotal += item.subtotal;
                    totalCamaras += cantidad;
                }
            }
        }

        // DVR recomendado según cantidad de cámaras
        if (totalCamaras > 0) {
            const dvrRecomendado = this.obtenerDVRRecomendado(totalCamaras);
            if (dvrRecomendado) {
                const item = {
                    nombre: dvrRecomendado.nombre,
                    cantidad: 1,
                    precioUnitario: dvrRecomendado.precio,
                    subtotal: dvrRecomendado.precio
                };
                cotizacion.items.push(item);
                cotizacion.subtotal += item.subtotal;
            }

            // Disco duro recomendado
            const discoRecomendado = this.obtenerDiscoRecomendado(totalCamaras);
            if (discoRecomendado) {
                const item = {
                    nombre: discoRecomendado.nombre,
                    cantidad: 1,
                    precioUnitario: discoRecomendado.precio,
                    subtotal: discoRecomendado.precio
                };
                cotizacion.items.push(item);
                cotizacion.subtotal += item.subtotal;
            }
        }

        // Agregar alarma si se especifica
        if (alarma) {
            const productoAlarma = this.productos.alarmas[alarma];
            if (productoAlarma) {
                const item = {
                    nombre: productoAlarma.nombre,
                    cantidad: 1,
                    precioUnitario: productoAlarma.precio,
                    subtotal: productoAlarma.precio
                };
                cotizacion.items.push(item);
                cotizacion.subtotal += item.subtotal;
            }
        }

        // Control de acceso
        if (controlAcceso) {
            const biometrico = this.productos.control_acceso.biometrico;
            const item = {
                nombre: biometrico.nombre,
                cantidad: 1,
                precioUnitario: biometrico.precio,
                subtotal: biometrico.precio
            };
            cotizacion.items.push(item);
            cotizacion.subtotal += item.subtotal;
        }

        // Instalación
        const totalPuntos = totalCamaras + (alarma ? 1 : 0) + (controlAcceso ? 1 : 0);
        if (totalPuntos > 0) {
            const tipoInstalacion = this.productos.instalacion[instalacion];
            if (tipoInstalacion) {
                const item = {
                    nombre: `${tipoInstalacion.nombre} (${totalPuntos} puntos)`,
                    cantidad: totalPuntos,
                    precioUnitario: tipoInstalacion.precio,
                    subtotal: tipoInstalacion.precio * totalPuntos
                };
                cotizacion.items.push(item);
                cotizacion.subtotal += item.subtotal;
            }
        }

        // Calcular descuentos
        cotizacion.descuentos = this.calcularDescuentos(cotizacion.subtotal, totalCamaras);
        cotizacion.total = cotizacion.subtotal - cotizacion.descuentos;

        return cotizacion;
    }

    // Obtener paquetes disponibles
    obtenerPaquetes() {
        return this.productos.paquetes;
    }

    // Obtener paquete específico
    obtenerPaquete(tipoPaquete) {
        return this.productos.paquetes[tipoPaquete];
    }

    // Buscar producto por clave
    buscarProducto(clave) {
        // Buscar en todas las categorías
        for (const categoria of Object.values(this.productos)) {
            if (categoria[clave]) {
                return categoria[clave];
            }
        }
        return null;
    }

    // Obtener DVR recomendado según cantidad de cámaras
    obtenerDVRRecomendado(totalCamaras) {
        let dvrKey = 'dvr_4ch'; // Default
        
        if (totalCamaras >= 1 && totalCamaras <= 4) {
            dvrKey = 'dvr_4ch';
        } else if (totalCamaras >= 5 && totalCamaras <= 8) {
            dvrKey = 'dvr_8ch';
        } else if (totalCamaras >= 9) {
            dvrKey = 'dvr_16ch';
        }

        return this.productos.dvr_almacenamiento[dvrKey];
    }

    // Obtener disco duro recomendado según cantidad de cámaras
    obtenerDiscoRecomendado(totalCamaras) {
        let discoKey = 'disco_1tb'; // Default
        
        if (totalCamaras >= 1 && totalCamaras <= 4) {
            discoKey = 'disco_1tb';
        } else if (totalCamaras >= 5) {
            discoKey = 'disco_2tb';
        }

        return this.productos.dvr_almacenamiento[discoKey];
    }

    // Calcular descuentos por volumen
    calcularDescuentos(subtotal, totalCamaras) {
        let descuento = 0;
        const reglas = this.matrices.reglas_cotizacion.descuentos_volumen;

        // Descuento por cantidad de cámaras
        if (totalCamaras >= 3 && totalCamaras <= 5) {
            descuento += subtotal * reglas.camaras['3_a_5'];
        } else if (totalCamaras >= 6 && totalCamaras <= 10) {
            descuento += subtotal * reglas.camaras['6_a_10'];
        } else if (totalCamaras >= 11 && totalCamaras <= 20) {
            descuento += subtotal * reglas.camaras['11_a_20'];
        } else if (totalCamaras > 20) {
            descuento += subtotal * reglas.camaras['mas_de_20'];
        }

        // Descuento por monto total
        if (subtotal >= 5000000 && subtotal < 10000000) {
            descuento += subtotal * reglas.general['5000000_a_10000000'];
        } else if (subtotal >= 10000000 && subtotal < 20000000) {
            descuento += subtotal * reglas.general['10000000_a_20000000'];
        } else if (subtotal >= 20000000 && subtotal < 50000000) {
            descuento += subtotal * reglas.general['20000000_a_50000000'];
        } else if (subtotal >= 50000000) {
            descuento += subtotal * reglas.general['mas_de_50000000'];
        }

        return Math.round(descuento);
    }

    // Generar recomendación básica cuando no hay información específica
    generarRecomendacionBasica() {
        return {
            tipoPropiedad: 'casa',
            area: 100,
            camarasRecomendadas: 3,
            productos: ['inalambrica_6mp', 'analoga_4mp'],
            paqueteSugerido: 'hogar_premium'
        };
    }

    // Formatear precio en pesos colombianos
    formatearPrecio(precio) {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(precio);
    }

    // Generar cotización en formato texto para chat
    generarTextoRecomendacion(info) {
        const recomendacion = this.generarRecomendacion(info);
        const paquete = this.obtenerPaquete(recomendacion.paqueteSugerido);
        
        let texto = `🏠 **RECOMENDACIÓN PERSONALIZADA IRON F**\n\n`;
        texto += `**Tipo de propiedad:** ${this.capitalize(recomendacion.tipoPropiedad)}\n`;
        texto += `**Área:** ${recomendacion.area} m²\n`;
        texto += `**Cámaras recomendadas:** ${recomendacion.camarasRecomendadas}\n\n`;

        if (paquete && recomendacion.paqueteSugerido !== 'personalizado') {
            texto += `📦 **PAQUETE SUGERIDO: ${paquete.nombre}**\n`;
            texto += `💰 **Precio:** ${this.formatearPrecio(paquete.precio)}\n`;
            texto += `💚 **Ahorro:** ${this.formatearPrecio(paquete.ahorro)}\n\n`;
            texto += `**Incluye:**\n`;
            paquete.incluye.forEach(item => {
                texto += `• ${item}\n`;
            });
        } else {
            texto += `📋 **PRODUCTOS RECOMENDADOS:**\n`;
            recomendacion.productos.forEach(productoKey => {
                const producto = this.buscarProducto(productoKey);
                if (producto) {
                    texto += `• ${producto.nombre} - ${this.formatearPrecio(producto.precio)}\n`;
                }
            });
        }

        texto += `\n🎯 ¿Te gustaría una cotización personalizada o más información sobre algún paquete específico?`;
        
        return texto;
    }

    // Generar texto de cotización detallada
    generarTextoCotizacion(cotizacion) {
        let texto = `💰 **COTIZACIÓN DETALLADA IRON F**\n\n`;
        
        cotizacion.items.forEach((item, index) => {
            texto += `${index + 1}. **${item.nombre}**\n`;
            texto += `   Cantidad: ${item.cantidad} | Precio: ${this.formatearPrecio(item.precioUnitario)}\n`;
            texto += `   Subtotal: ${this.formatearPrecio(item.subtotal)}\n\n`;
        });

        texto += `**RESUMEN:**\n`;
        texto += `Subtotal: ${this.formatearPrecio(cotizacion.subtotal)}\n`;
        
        if (cotizacion.descuentos > 0) {
            texto += `Descuentos: -${this.formatearPrecio(cotizacion.descuentos)}\n`;
        }
        
        texto += `**TOTAL: ${this.formatearPrecio(cotizacion.total)}**\n\n`;
        
        texto += `📞 **CONTACTO:**\n`;
        texto += `WhatsApp: ${this.matrices.configuracion_sistema.contacto.whatsapp}\n`;
        texto += `Email: ${this.matrices.configuracion_sistema.contacto.email}\n`;
        texto += `Web: ${this.matrices.configuracion_sistema.contacto.web}\n\n`;
        
        texto += `✅ Garantía: ${this.matrices.configuracion_sistema.garantia_meses} meses\n`;
        texto += `⏱️ Tiempo de instalación: ${this.matrices.configuracion_sistema.tiempo_instalacion_horas} horas`;
        
        return texto;
    }

    // Utilidad para capitalizar texto
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // Obtener todos los productos por categoría
    obtenerProductosPorCategoria(categoria) {
        return this.productos[categoria] || {};
    }

    // Comparar paquetes
    compararPaquetes() {
        const paquetes = this.obtenerPaquetes();
        let comparacion = `📊 **COMPARACIÓN DE PAQUETES IRON F**\n\n`;
        
        Object.values(paquetes).forEach(paquete => {
            comparacion += `**${paquete.nombre}**\n`;
            comparacion += `💰 Precio: ${this.formatearPrecio(paquete.precio)}\n`;
            comparacion += `💚 Ahorro: ${this.formatearPrecio(paquete.ahorro)}\n`;
            comparacion += `📋 Incluye: ${paquete.incluye.length} productos\n\n`;
        });
        
        return comparacion;
    }
}

module.exports = CotizadorService;