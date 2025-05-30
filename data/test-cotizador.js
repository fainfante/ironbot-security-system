const CotizadorService = require('./services/cotizador');

const cotizador = new CotizadorService();

// Prueba 1: Casa residencial
console.log('=== PRUEBA 1: Casa Residencial ===');
const cotizacion1 = cotizador.generarCotizacion({
    tipoPropiedad: 'residencial',
    area: 120,
    cliente: 'Juan Pérez',
    prioridades: ['camaras', 'alarmas']
});

console.log(`ID: ${cotizacion1.id}`);
console.log(`Total: $${cotizacion1.total.toFixed(2)}`);
console.log('Productos:');
cotizacion1.productos.forEach(p => {
    console.log(`  - ${p.cantidad}x ${p.nombre}: $${p.precio_total}`);
});

console.log('\n=== PRUEBA 2: Negocio Comercial ===');
const cotizacion2 = cotizador.generarCotizacion({
    tipoPropiedad: 'comercial',
    area: 200,
    cliente: 'Empresa ABC',
    prioridades: ['camaras', 'control_acceso']
});

console.log(`ID: ${cotizacion2.id}`);
console.log(`Total: $${cotizacion2.total.toFixed(2)}`);
console.log(`Descuento aplicado: $${cotizacion2.descuentos.toFixed(2)}`);

console.log('\n=== PRUEBA 3: Paquetes Predefinidos ===');
const paquetes = cotizador.obtenerPaquetes();
Object.keys(paquetes).forEach(key => {
    const paquete = paquetes[key];
    console.log(`${paquete.nombre}: $${paquete.precio_total} (Ahorro: $${paquete.ahorro})`);
});

console.log('\nPruebas completadas ✅');