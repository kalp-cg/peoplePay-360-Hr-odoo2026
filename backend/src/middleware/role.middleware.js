const { sendError } = require('../utils/response');

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return sendError(res, 'Authentication required before authorization.', 401, 'UNAUTHORIZED');
    }

    // ADMIN always has full access
    if (req.user.role === 'ADMIN') {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendError(
        res,
        `Access denied. Requires one of the following roles: [${allowedRoles.join(', ')}]. Current role: ${req.user.role}`,
        403,
        'FORBIDDEN'
      );
    }

    next();
  };
}

module.exports = authorize;
