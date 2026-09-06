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

  async getProvisionOptions(role) {
    if (!role) {
      throw { statusCode: 400, message: 'Role is required.', code: 'MISSING_ROLE' };
    }
    return userRepository.getProvisionOptions(role);
  }

  async createUser(data, adminUser) {
    // Validate required fields based on role
    const { role } = data;

    if (!role) {
      throw { statusCode: 400, message: 'Role is required.', code: 'MISSING_ROLE' };
    }

    if (role === 'ADMIN') {
      throw {
        statusCode: 403,
        message: 'Cannot create additional Admin accounts. The system allows only one primary Administrator.',
        code: 'ADMIN_CREATION_FORBIDDEN',
      };
    }

    // Non-ADMIN roles need an employee profile, so they need dept + job position
    if (!data.departmentId) {
      throw { statusCode: 400, message: 'Department is required for this role.', code: 'MISSING_DEPARTMENT' };
    }
    if (!data.jobPositionId) {
      throw { statusCode: 400, message: 'Job Position is required for this role.', code: 'MISSING_JOB_POSITION' };
    }
    // EMPLOYEE must have a manager (HR_MANAGER's employee ID)
    if (role === 'EMPLOYEE' && !data.managerId) {
      throw { statusCode: 400, message: 'An HR Manager must be selected for employee accounts.', code: 'MISSING_MANAGER' };
    }
    // HR_PAYROLL_USER must have a manager (HR_PAYROLL_MANAGER's employee ID)
    if (role === 'HR_PAYROLL_USER' && !data.managerId) {
      throw { statusCode: 400, message: 'An HR Payroll Manager must be selected for payroll user accounts.', code: 'MISSING_MANAGER' };
    }

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
    if (data.role === 'ADMIN' && current.role !== 'ADMIN') {
      throw {
        statusCode: 403,
        message: 'Promoting a user to ADMIN is not permitted. Only one system administrator exists.',
        code: 'ADMIN_PROMOTION_FORBIDDEN',
      };
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
    if (current.role === 'ADMIN') {
      throw {
        statusCode: 403,
        message: 'The system administrator account cannot be deleted.',
        code: 'ADMIN_DELETION_FORBIDDEN',
      };
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
