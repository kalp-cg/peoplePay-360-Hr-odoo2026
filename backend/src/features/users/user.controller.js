const userService = require('./user.service');
const { sendSuccess, sendError } = require('../../utils/response');

class UserController {
  async getAll(req, res, next) {
    try {
      const users = await userService.getAllUsers(req.query);
      return sendSuccess(res, users);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const user = await userService.getUserById(req.params.id);
      return sendSuccess(res, user);
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const { name, email, role } = req.body;
      if (!name || !email) {
        return sendError(res, 'Name and email are required.', 400, 'MISSING_FIELDS');
      }
      const created = await userService.createUser(req.body, req.user);
      return sendSuccess(res, created, 201, 'User created successfully.');
    } catch (err) {
      next(err);
    }
  }

  async update(req, res, next) {
    try {
      const updated = await userService.updateUser(req.params.id, req.body, req.user);
      return sendSuccess(res, updated, 200, 'User updated successfully.');
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await userService.deleteUser(req.params.id, req.user);
      return sendSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new UserController();
