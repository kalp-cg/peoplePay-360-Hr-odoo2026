const userRepository = require('./user.repository');
const auditService = require('../audit/audit.service');

class UserService {
  async getAllUsers(query) {
    return userRepository.findAll(query);
  }

  async getUserById(id) {
    const user = await userRepository.findById(id);
    if (!user) {
      throw { statusCode: 404, message: 'User not found.', code: 'USER_NOT_FOUND' };
    }
    const { password: _, ...cleanUser } = user;
    return cleanUser;
  }

  async createUser(data, adminUser) {
    const created = await userRepository.create(data);
    await auditService.log({
      userId: adminUser.id,
      action: 'USER_CREATED',
      entityName: 'User',
      entityId: String(created.id),
      previousValue: null,
      newValue: JSON.stringify({ email: created.email, role: created.role }),
    });
    const { password: _, ...cleanUser } = created;
    return cleanUser;
  }

  async updateUser(id, data, adminUser) {
    const current = await userRepository.findById(id);
    if (!current) {
      throw { statusCode: 404, message: 'User not found.', code: 'USER_NOT_FOUND' };
    }
    const updated = await userRepository.update(id, data);
    await auditService.log({
      userId: adminUser.id,
      action: 'USER_UPDATED',
      entityName: 'User',
      entityId: String(id),
      previousValue: JSON.stringify({ role: current.role }),
      newValue: JSON.stringify({ role: updated.role }),
    });
    return updated;
  }

  async deleteUser(id, adminUser) {
    const current = await userRepository.findById(id);
    if (!current) {
      throw { statusCode: 404, message: 'User not found.', code: 'USER_NOT_FOUND' };
    }
    await userRepository.delete(id);
    await auditService.log({
      userId: adminUser.id,
      action: 'USER_DELETED',
      entityName: 'User',
      entityId: String(id),
      previousValue: JSON.stringify({ email: current.email }),
      newValue: null,
    });
    return { message: 'User deleted successfully.' };
  }
}

module.exports = new UserService();
