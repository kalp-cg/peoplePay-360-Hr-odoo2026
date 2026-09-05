const prisma = require('../../config/database');

class AuthRepository {
  async findByEmail(email) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        employee: {
          include: {
            department: true,
            jobPosition: true,
          },
        },
      },
    });
  }

  async findById(id) {
    return prisma.user.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            department: true,
            jobPosition: true,
          },
        },
      },
    });
  }

  async createUser(data) {
    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        password: data.password,
        role: data.role || 'EMPLOYEE',
        employeeId: data.employeeId || null,
      },
      include: {
        employee: true,
      },
    });
  }
}

module.exports = new AuthRepository();
