const jwt = require('jsonwebtoken');
const env = require('../config/env');
const prisma = require('../config/database');
const { sendError } = require('../utils/response');

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, 'Authentication required. Missing Bearer token.', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET);
    } catch (err) {
      return sendError(res, 'Invalid or expired token.', 401, 'INVALID_TOKEN');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        employee: {
          include: {
            department: true,
            jobPosition: true,
          },
        },
      },
    });

    if (!user) {
      return sendError(res, 'User belonging to this token no longer exists.', 401, 'USER_NOT_FOUND');
    }

    req.user = user;
    next();
  } catch (err) {
    return sendError(res, 'Authentication failed.', 500, 'AUTH_ERROR', err.message);
  }
}

module.exports = authenticate;
