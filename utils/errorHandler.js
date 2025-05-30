// Error handler middleware
const errorHandler = (err, req, res, next) => {
    console.error('Error caught by error handler:', err);

    // Error por defecto
    let error = { ...err };
    error.message = err.message;

    // Log del error
    console.error(err.stack);

    // Error de validación de Mongoose
    if (err.name === 'ValidationError') {
        const message = Object.values(err.errors).map(val => val.message);
        error = { message, statusCode: 400 };
    }

    // Error de recurso no encontrado
    if (err.name === 'CastError') {
        const message = 'Recurso no encontrado';
        error = { message, statusCode: 404 };
    }

    // Error de duplicado
    if (err.code === 11000) {
        const message = 'Recurso duplicado';
        error = { message, statusCode: 400 };
    }

    res.status(error.statusCode || 500).json({
        success: false,
        error: error.message || 'Error del servidor',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = errorHandler;