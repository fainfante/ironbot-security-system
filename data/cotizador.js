const fs = require('fs');
const path = require('path');

class CotizadorService {
    constructor() {
        this.productos = this.cargarJSON('productos.json');
        this.matrices = this.cargarJSON('matrices.json');
    }

    cargarJSON(archivo) {
        try {
            const rutaArchivo = path.join(__dirname, '../data', archivo);
            const contenido = fs.readFileSync(rutaArchivo, 'utf8');
            return JSON.parse(contenido);
        } catch (error) {
            console.error(`Error cargando ${archivo}:`, error);
            return {};
        }
    }

    // Generar cotización automática basada en parámetros
    generarCotizacion(parametros) {
        const {
            tipoPropiedad = 'residencial',
            area = 100,
            presupuesto = null,
            prioridades = ['camaras'], // camaras, alarmas, control_acceso
            ubicacion = 'general'
        } = parametros;

        try {
            const cotizacion = {
                id: this.generarId(),
                fecha: new Date().toISOString(),
                cliente: parametros.cliente || 'Cliente Potencial',
                parametros: parametros,
                productos: [],
                subtotal: 0,
                descuentos: 0,
                iva: 0,
                total: 0,
                validez: this.calcularValidez(),
                recomendaciones: []
            };

            // Determinar configuración según tipo de propiedad
            const configPropiedad = this.matrices.tipos_propiedad[tipoPropiedad];
            if (!configPropiedad) {
                throw new Error(`Tipo de propiedad '${tipoPropiedad}' no válido`);
            }

            // Calcular productos recomendados
            const productosRecomendados = this.calcularProductos(area, configPropiedad, prioridades);
            
            // Agregar productos a la cotización
            productosRecomendados.forEach(item => {
                const producto = this.productos[item.categoria][item.tipo];
                if (producto) {
                    const itemCotizacion = {
                        categoria: item.categoria,
                        tipo: item.tipo,
                        nombre: producto.nombre,
                        descripcion: producto.descripcion,
                        cantidad: item.cantidad,
                        precio_unitario: producto.precio || producto.precio_por_punto,
                        precio_total: (producto.precio || producto.precio_por_punto) * item.cantidad
                    };
                    cotizacion.productos.push(itemCotizacion);
                    cotizacion.subtotal += itemCotizacion.precio_total;
                }
            });

            // Aplicar descuentos
            const descuento = configPropiedad.descuento;
            cotizacion.descuentos = cotizacion.subtotal * descuento;

            // Calcular IVA
            const subtotalConDescuento = cotizacion.subtotal - cotizacion.descuentos;
            cotizacion.iva = subtotalConDescuento * this.matrices.configuracion.iva;

            // Total final
            cotizacion.total = subtotalConDescuento + cotizacion.iva;

            // Agregar recomendaciones
            cotizacion.recomendaciones = this.generarRecomendaciones(parametros, cotizacion);

            // Guardar cotización
            this.guardarCotizacion(cotizacion);

            return cotizacion;

        } catch (error) {
            console.error('Error generando cotización:', error);
            throw error;
        }
    }

    calcularProductos(area, config, prioridades) {
        const productos = [];
        const rangoArea = this.determinarRangoArea(area);

        // Calcular cámaras
        if (prioridades.includes('camaras')) {
            const cantidadCamaras = Math.ceil(
                area * config.camaras_por_m2 * rangoArea.multiplicador_camaras
            );
            
            productos.push({
                categoria: 'camaras',
                tipo: config.tipo_camara_recomendada,
                cantidad: Math.max(cantidadCamaras, 2) // Mínimo 2 cámaras
            });

            // DVR apropiado
            const capacidadDVR = this.seleccionarDVR(cantidadCamaras);
            productos.push({
                categoria: 'dvr',
                tipo: capacidadDVR,
                cantidad: 1
            });
        }

        // Alarma si está en prioridades
        if (prioridades.includes('alarmas')) {
            productos.push({
                categoria: 'alarmas',
                tipo: config.alarma_recomendada,
                cantidad: 1
            });
        }

        // Control de acceso si está en prioridades
        if (prioridades.includes('control_acceso')) {
            productos.push({
                categoria: 'control_acceso',
                tipo: 'biometrico', // Por defecto biométrico
                cantidad: 1
            });
        }

        // Instalación
        const totalPuntos = productos.reduce((sum, p) => sum + p.cantidad, 0);
        productos.push({
            categoria: 'instalacion',
            tipo: rangoArea.instalacion_recomendada,
            cantidad: totalPuntos
        });

        return productos;
    }

    determinarRangoArea(area) {
        for (const [key, rango] of Object.entries(this.matrices.rangos_area)) {
            if (area >= rango.min && area <= rango.max) {
                return rango;
            }
        }
        return this.matrices.rangos_area.mediana; // Por defecto
    }

    seleccionarDVR(cantidadCamaras) {
        if (cantidadCamaras <= 4) return 'dvr_4ch';
        if (cantidadCamaras <= 8) return 'dvr_8ch';
        return 'dvr_16ch';
    }

    generarRecomendaciones(parametros, cotizacion) {
        const recomendaciones = [];

        // Recomendaciones basadas en el área
        if (parametros.area > 300) {
            recomendaciones.push({
                tipo: 'mejora',
                titulo: 'Considera cámaras adicionales',
                descripcion: 'Para áreas grandes recomendamos cámaras con zoom óptico'
            });
        }

        // Recomendaciones de ahorro
        if (cotizacion.total > 2000) {
            recomendaciones.push({
                tipo: 'ahorro',
                titulo: 'Descuento por volumen disponible',
                descripcion: 'Contacta para descuentos adicionales en compras grandes'
            });
        }

        // Recomendación de mantenimiento
        recomendaciones.push({
            tipo: 'servicio',
            titulo: 'Plan de mantenimiento',
            descripcion: 'Incluye plan de mantenimiento anual para garantía extendida'
        });

        return recomendaciones;
    }

    generarId() {
        const fecha = new Date();
        const año = fecha.getFullYear();
        const mes = String(fecha.getMonth() + 1).padStart(2, '0');
        const dia = String(fecha.getDate()).padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        
        return `COT-${año}${mes}${dia}-${random}`;
    }

    calcularValidez() {
        const fecha = new Date();
        fecha.setDate(fecha.getDate() + this.matrices.configuracion.validez_cotizacion_dias);
        return fecha.toISOString().split('T')[0]; // Solo fecha YYYY-MM-DD
    }

    guardarCotizacion(cotizacion) {
        try {
            const rutaArchivo = path.join(__dirname, '../data/cotizaciones.json');
            let cotizaciones = [];

            // Cargar cotizaciones existentes
            if (fs.existsSync(rutaArchivo)) {
                const contenido = fs.readFileSync(rutaArchivo, 'utf8');
                cotizaciones = JSON.parse(contenido);
            }

            // Agregar nueva cotización
            cotizaciones.push(cotizacion);

            // Mantener solo las últimas 100 cotizaciones
            if (cotizaciones.length > 100) {
                cotizaciones = cotizaciones.slice(-100);
            }

            // Guardar
            fs.writeFileSync(rutaArchivo, JSON.stringify(cotizaciones, null, 2));
        } catch (error) {
            console.error('Error guardando cotización:', error);
        }
    }

    // Método para obtener paquetes predefinidos
    obtenerPaquetes() {
        return this.matrices.paquetes_predefinidos;
    }

    // Método para buscar productos por categoría
    buscarProductos(categoria = null) {
        if (categoria) {
            return this.productos[categoria] || {};
        }
        return this.productos;
    }
}

module.exports = CotizadorService;