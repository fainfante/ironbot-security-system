const express = require('express');
const router = express.Router();
const CotizadorService = require('../services/cotizador');

const cotizador = new CotizadorService();

// Obtener todos los productos
router.get('/productos', (req, res) => {
    try {
        const productos = cotizador.productos;
        res.json({
            success: true,
            data: productos
        });
    } catch (error) {
        console.error('Error obteniendo productos:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Obtener todos los paquetes
router.get('/paquetes', (req, res) => {
    try {
        const paquetes = cotizador.obtenerPaquetes();
        res.json({
            success: true,
            data: paquetes
        });
    } catch (error) {
        console.error('Error obteniendo paquetes:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Obtener paquete específico
router.get('/paquetes/:tipo', (req, res) => {
    try {
        const { tipo } = req.params;
        const paquete = cotizador.obtenerPaquete(tipo);
        
        if (!paquete) {
            return res.status(404).json({
                success: false,
                error: 'Paquete no encontrado'
            });
        }

        res.json({
            success: true,
            data: paquete
        });
    } catch (error) {
        console.error('Error obteniendo paquete:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Detectar si un mensaje es solicitud de cotización
router.post('/detectar', (req, res) => {
    try {
        const { mensaje } = req.body;
        
        if (!mensaje) {
            return res.status(400).json({
                success: false,
                error: 'Mensaje requerido'
            });
        }

        const esCotizacion = cotizador.detectarSolicitudCotizacion(mensaje);
        
        res.json({
            success: true,
            data: {
                esCotizacion,
                mensaje
            }
        });
    } catch (error) {
        console.error('Error detectando cotización:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Calcular cotización personalizada
router.post('/calcular', (req, res) => {
    try {
        const solicitud = req.body;
        
        console.log('📋 Solicitud de cotización recibida:', solicitud);

        // Validar datos básicos
        if (!solicitud.tipoPropiedad || !solicitud.area) {
            return res.status(400).json({
                success: false,
                error: 'Tipo de propiedad y área son requeridos'
            });
        }

        // Generar cotización
        const cotizacion = cotizador.calcularCotizacion(solicitud);
        
        res.json({
            success: true,
            data: {
                cotizacion,
                solicitud,
                timestamp: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Error calculando cotización:', error);
        res.status(500).json({
            success: false,
            error: 'Error calculando cotización',
            details: error.message
        });
    }
});

// Generar recomendación basada en información
router.post('/recomendar', (req, res) => {
    try {
        const { mensaje } = req.body;
        
        if (!mensaje) {
            return res.status(400).json({
                success: false,
                error: 'Mensaje requerido'
            });
        }

        const info = cotizador.extraerInformacion(mensaje);
        const recomendacion = cotizador.generarRecomendacion(info);
        const texto = cotizador.generarTextoRecomendacion(info);
        
        res.json({
            success: true,
            data: {
                info,
                recomendacion,
                texto
            }
        });
    } catch (error) {
        console.error('Error generando recomendación:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Obtener configuración del sistema
router.get('/config', (req, res) => {
    try {
        const config = cotizador.matrices.configuracion_sistema || {};
        res.json({
            success: true,
            data: config
        });
    } catch (error) {
        console.error('Error obteniendo configuración:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Comparar paquetes
router.get('/comparar', (req, res) => {
    try {
        const comparacion = cotizador.compararPaquetes();
        res.json({
            success: true,
            data: {
                comparacion
            }
        });
    } catch (error) {
        console.error('Error comparando paquetes:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Middleware de manejo de errores
router.use((error, req, res, next) => {
    console.error('Error en rutas de cotización:', error);
    res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
    });
});

module.exports = router;