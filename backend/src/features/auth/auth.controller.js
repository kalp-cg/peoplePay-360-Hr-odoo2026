const authService = require('./auth.service');
const { sendSuccess, sendError } = require('../../utils/response');

class AuthController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return sendError(res, 'Email and password are required.', 400, 'MISSING_FIELDS');
      }
      const result = await authService.login(email, password);
      return sendSuccess(res, result, 200, 'Logged in successfully.');
    } catch (err) {
      next(err);
    }
  }

  async signup(req, res, next) {
    try {
      const { name, email, password, role, employeeId } = req.body;
      if (!name || !email || !password) {
        return sendError(res, 'Name, email, and password are required.', 400, 'MISSING_FIELDS');
      }
      const result = await authService.signup({ name, email, password, role, employeeId });
      return sendSuccess(res, result, 201, 'User registered successfully.');
    } catch (err) {
      next(err);
    }
  }

  async getMe(req, res, next) {
    try {
      const result = await authService.getMe(req.user.id);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
