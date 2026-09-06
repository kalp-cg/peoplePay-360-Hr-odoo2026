const prisma = require('../../config/database');
const bcrypt = require('bcryptjs');
const { paginate, paginateResult } = require('../../utils/paginate');

class UserRepository {
  async findAll({ search, role, page, limit } = {}) {
    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) where.role = role;

    const { page: p, limit: l, skip } = paginate({ page, limit: limit || 50 });

    const [data, total] = await Promise.all([
      prisma.user.findMany({
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
              managerId: true,
              department: { select: { id: true, name: true } },
              jobPosition: { select: { id: true, title: true } },
            },
          },
          createdAt: true,
        },
        orderBy: { id: 'asc' },
        skip,
        take: l,
      }),
      prisma.user.count({ where }),
    ]);

    return paginateResult(data, total, p, l);
  }

  async findById(id) {
    return prisma.user.findUnique({
      where: { id: parseInt(id, 10) },
      include: { employee: true },
    });
  }

  /**
   * Returns all data needed to render the creation modal for a given role:
   * - departments
   * - jobPositions
   * - workingSchedules
   * - managers: the list of users the new person should "report to"
   *   - EMPLOYEE      → all HR_MANAGERs (with their employee profiles)
   *   - HR_PAYROLL_USER → all HR_PAYROLL_MANAGERs
   *   - others        → empty array (auto-assigned or no manager)
   */
  async getProvisionOptions(role) {
    const [departments, jobPositions, workingSchedules] = await Promise.all([
      prisma.department.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, code: true } }),
      prisma.jobPosition.findMany({
        orderBy: { title: 'asc' },
        select: { id: true, title: true, departmentId: true },
      }),
      prisma.workingSchedule.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true, weeklyHours: true },
      }),
    ]);

    // Role → which manager role is the "reports to" target
    const managerRoleMap = {
      EMPLOYEE: 'HR_MANAGER',
      HR_PAYROLL_USER: 'HR_PAYROLL_MANAGER',
    };

    let managers = [];
    const managerRole = managerRoleMap[role];
    if (managerRole) {
      managers = await prisma.user.findMany({
        where: { role: managerRole, employee: { isNot: null } },
        select: {
          id: true,
          name: true,
          email: true,
          employee: {
            select: {
              id: true,
              employeeId: true,
              department: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { name: 'asc' },
      });
    }

    return { departments, jobPositions, workingSchedules, managers };
  }

  /**
   * Generate next employee ID string like "EMP-0261"
   */
  async generateNextEmployeeId() {
    const last = await prisma.employee.findFirst({
      orderBy: { id: 'desc' },
      select: { employeeId: true },
    });
    if (!last) return 'EMP-0001';
    const num = parseInt(last.employeeId.replace(/\D/g, ''), 10) || 0;
    return `EMP-${String(num + 1).padStart(4, '0')}`;
  }

  /**
   * Atomically creates Employee + User records.
   * For ADMIN role: only User is created (no employee profile).
   */
  async create(data) {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password || 'PeoplePay@123', salt);

    // ADMIN: no employee profile needed
    if (data.role === 'ADMIN') {
      return prisma.user.create({
        data: {
          name: data.name,
          email: data.email.toLowerCase(),
          password: hashedPassword,
          role: 'ADMIN',
        },
        select: {
          id: true, name: true, email: true, role: true,
          employeeId: true, employee: true, createdAt: true,
        },
      });
    }

    // All other roles: create Employee first, then User linked to it
    const newEmployeeId = await this.generateNextEmployeeId();

    return prisma.$transaction(async (tx) => {
      const employee = await tx.employee.create({
        data: {
          employeeId: newEmployeeId,
          name: data.name,
          email: data.email.toLowerCase(),
          phone: data.phone || null,
          departmentId: parseInt(data.departmentId, 10),
          jobPositionId: parseInt(data.jobPositionId, 10),
          managerId: data.managerId ? parseInt(data.managerId, 10) : null,
          workingScheduleId: data.workingScheduleId ? parseInt(data.workingScheduleId, 10) : null,
          joiningDate: data.joiningDate ? new Date(data.joiningDate) : new Date(),
          employeeType: data.employeeType || 'FULL_TIME',
          status: 'ACTIVE',
        },
      });

      const user = await tx.user.create({
        data: {
          name: data.name,
          email: data.email.toLowerCase(),
          password: hashedPassword,
          role: data.role,
          employeeId: employee.id,
        },
        select: {
          id: true, name: true, email: true, role: true,
          employeeId: true,
          employee: {
            select: {
              id: true, employeeId: true, name: true,
              department: { select: { id: true, name: true } },
              jobPosition: { select: { id: true, title: true } },
            },
          },
          createdAt: true,
        },
      });

      return user;
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
        id: true, name: true, email: true, role: true,
        employeeId: true, employee: true,
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
