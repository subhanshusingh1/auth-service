// /middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
    // Set default status code to 500 if not already set by any route or previous middleware
    const statusCode = res.statusCode !== 200 ? res.statusCode : 500;

    // Send response with the error message
    res.status(statusCode).json({
        success: false,
        message: err.message || 'Something went wrong',
        error: {
            code: statusCode,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined, // Only show stack trace in development
        },
    });

    // Log the error details for debugging (only in development mode)
    if (process.env.NODE_ENV === 'development') {
        console.error('Error details:', err); // Full error log for development
    }
};

// Handle undefined routes (404 Not Found)
const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404); // Set the status to 404 for Not Found error
    next(error); // Pass the error to the errorHandler middleware
};

module.exports = { errorHandler, notFound };
