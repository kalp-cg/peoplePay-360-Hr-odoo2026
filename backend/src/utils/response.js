function sendSuccess(res, data, statusCode = 200, message = null) {
  const response = {
    success: true,
    data,
  };
  if (message) response.message = message;
  return res.status(statusCode).json(response);
}

function sendError(res, message, statusCode = 500, code = 'INTERNAL_SERVER_ERROR', details = null) {
  const response = {
    success: false,
    message,
    code,
  };
  if (details) response.details = details;
  return res.status(statusCode).json(response);
}

module.exports = {
  sendSuccess,
  sendError,
};
