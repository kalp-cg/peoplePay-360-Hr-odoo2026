const prisma = require('../../config/database');
const bcrypt = require('bcryptjs');

class UserRepository {
  async findAll({ search, role }) {
    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) where.role = role;

    return prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        employeeId: true,
        employee: {
          select: {
            id: true,
            employeeId: true,
            name: true,
            department: { select: { id: true, name: true } },
            jobPosition: { select: { id: true, title: true } },
          },
        },
        createdAt: true,
      },
      orderBy: { id: 'asc' },
    });
  }

  async findById(id) {
    return prisma.user.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        employee: true,
      },
    });
  }

  async create(data) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password || 'PeoplePay@123', salt);

    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        password: hashedPassword,
        role: data.role || 'EMPLOYEE',
        employeeId: data.employeeId ? parseInt(data.employeeId, 10) : null,
      },
      include: {
        employee: true,
      },
    });
  }

  async update(id, data) {
    const updateData = {};
    if (data.name) updateData.name = data.name;
    if (data.email) updateData.email = data.email.toLowerCase();
    if (data.role) updateData.role = data.role;
    if (data.employeeId !== undefined) {
      updateData.employeeId = data.employeeId ? parseInt(data.employeeId, 10) : null;
    }
    if (data.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(data.password, salt);
    }

    return prisma.user.update({
      where: { id: parseInt(id, 10) },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        employeeId: true,
        employee: true,
      },
    });
  }

  async delete(id) {
    return prisma.user.delete({
      where: { id: parseInt(id, 10) },
    });
  }
}

module.exports = new UserRepository();
