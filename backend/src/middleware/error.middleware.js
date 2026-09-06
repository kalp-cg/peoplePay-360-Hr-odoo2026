const logger = require('../utils/logger');
const { sendError } = require('../utils/response');

/**
 * Prisma errors carry the full query, the ORM call site and an absolute server
 * file path in `err.message`. Returning that verbatim both leaks internals and
 * shows the user a stack trace, so each known code is translated into a clean
 * 4xx. The original error is still logged in full server-side.
 */
function translatePrismaError(err) {
  if (err.name === 'PrismaClientValidationError') {
    return {
      statusCode: 400,
      code: 'INVALID_INPUT',
      message: 'One or more values in the request are invalid for this resource.',
    };
  }

  if (err.name === 'PrismaClientInitializationError' || err.name === 'PrismaClientRustPanicError') {
    return {
      statusCode: 503,
      code: 'DATABASE_UNAVAILABLE',
      message: 'The database is currently unreachable. Please try again shortly.',
    };
  }

  if (err.name !== 'PrismaClientKnownRequestError') return null;

  const target = err.meta && err.meta.target;
  const fields = Array.isArray(target) ? target.join(', ') : target;

  switch (err.code) {
    case 'P2002':
      return {
        statusCode: 409,
        code: 'DUPLICATE_RECORD',
        message: fields
          ? `A record with the same ${fields} already exists.`
          : 'A record with these details already exists.',
      };
    case 'P2003':
      return {
        statusCode: 400,
        code: 'INVALID_REFERENCE',
        message: 'The request references a record that does not exist.',
      };
    case 'P2011':
    case 'P2012':
      return { statusCode: 400, code: 'MISSING_FIELDS', message: 'A required field is missing.' };
    case 'P2000':
      return { statusCode: 400, code: 'VALUE_TOO_LONG', message: 'A submitted value is too long for its field.' };
    case 'P2014':
      return {
        statusCode: 409,
        code: 'RELATION_CONFLICT',
        message: 'This record is still referenced by other records and cannot be changed.',
      };
    case 'P2025':
      return { statusCode: 404, code: 'NOT_FOUND', message: 'The requested record was not found.' };
    default:
      return {
        statusCode: 400,
        code: 'DATABASE_REQUEST_ERROR',
        message: 'The request could not be completed against the database.',
      };
  }
}

function errorHandler(err, req, res, next) {
  logger.error(`Unhandled exception on ${req.method} ${req.url}:`, err.stack || err.message);

  if (err.name === 'ZodError') {
    return sendError(res, 'Validation failed.', 400, 'VALIDATION_ERROR', err.errors);
  }

  const prisma = translatePrismaError(err);
  if (prisma) {
    return sendError(res, prisma.message, prisma.statusCode, prisma.code);
  }

  const statusCode = err.statusCode || 500;
  const raw = err.message || 'An unexpected internal server error occurred.';
  // Domain errors thrown by the services ("Employee X has no valid contract") are
  // useful to show. Anything carrying a file path, ORM internals or a stack frame
  // is not, so it is replaced rather than echoed back to the browser.
  const leaksInternals =
    /(?:[A-Za-z]:\\|\/(?:home|Users|var|usr)\/|node_modules|prisma\.|PrismaClient|\n\s+at\s)/.test(raw);
  const message = leaksInternals ? 'An unexpected internal server error occurred.' : raw;
  return sendError(res, message, statusCode, err.code || 'INTERNAL_SERVER_ERROR');
}

module.exports = errorHandler;
