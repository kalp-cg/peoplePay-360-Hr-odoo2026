const logger = require('../utils/logger');
const { sendError } = require('../utils/response');

function errorHandler(err, req, res, next) {
  logger.error(`Unhandled exception on ${req.method} ${req.url}:`, err.stack || err.message);

  if (err.name === 'ZodError') {
    return sendError(res, 'Validation failed.', 400, 'VALIDATION_ERROR', err.errors);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'An unexpected internal server error occurred.';
  return sendError(res, message, statusCode, err.code || 'INTERNAL_SERVER_ERROR');
}

module.exports = errorHandler;
