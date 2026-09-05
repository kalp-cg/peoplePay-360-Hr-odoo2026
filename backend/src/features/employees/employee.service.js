const employeeRepository = require('./employee.repository');
const auditService = require('../audit/audit.service');
const prisma = require('../../config/database');

const employeeCache = new Map();
const CACHE_TTL_MS = 6000;

class EmployeeService {
  async getAllEmployees(query, user) {
    // If employee role, restrict to viewing self if requested
    if (user.role === 'EMPLOYEE' && user.employeeId) {
      const emp = await employeeRepository.findById(user.employeeId);
      return emp ? [emp] : [];
    }

    const q = { ...query };
    if (user && user.role === 'HR_MANAGER' && q.scope !== 'all') {
      const subIds = await this.getSubordinateIdsForUser(user);
      if (subIds !== null) {
        q.subordinateIds = subIds;
      }
    }

    const cacheKey = `emp_${JSON.stringify(q || {})}_${user.role}_${user.employeeId || ''}`;
    const cached = employeeCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return cached.data;
    }

    const employees = await employeeRepository.findAll(q);

    if (employees.length === 0) return [];

    // Batch fetch active contracts and leave allocations in 2 queries instead of 2 * N queries
    const empIds = employees.map((e) => e.id);
    const [activeContracts, allocationsGrouped] = await Promise.all([
      prisma.contract.findMany({
        where: { employeeId: { in: empIds }, status: 'ACTIVE' },
        select: { employeeId: true, wage: true },
      }),
      prisma.timeOffAllocation.groupBy({
        by: ['employeeId'],
        where: { employeeId: { in: empIds } },
        _sum: { remainingDays: true, allocatedDays: true },
      }),
    ]);

    const contractMap = new Map();
    for (const c of activeContracts) {
      if (!contractMap.has(c.employeeId)) contractMap.set(c.employeeId, c.wage);
    }

    const allocMap = new Map();
    for (const a of allocationsGrouped) {
      allocMap.set(a.employeeId, {
        remaining: a._sum?.remainingDays || 0,
        allocated: a._sum?.allocatedDays || 0,
      });
    }

    const enriched = employees.map((emp) => {
      const alloc = allocMap.get(emp.id) || { remaining: 0, allocated: 0 };
      return {
        ...emp,
        activeWage: contractMap.get(emp.id) || 0,
        totalRemainingLeaves: alloc.remaining,
        totalAllocatedLeaves: alloc.allocated,
      };
    });

    employeeCache.set(cacheKey, { timestamp: Date.now(), data: enriched });
    return enriched;
  }

  async getEmployeeById(id, user) {
    const emp = await employeeRepository.findById(id);
    if (!emp) {
      throw { statusCode: 404, message: 'Employee not found.', code: 'EMPLOYEE_NOT_FOUND' };
    }

    // Role check: An EMPLOYEE can only view their own record
    if (user.role === 'EMPLOYEE' && user.employeeId !== emp.id) {
      throw { statusCode: 403, message: 'Access denied. You can only view your own employee details.', code: 'FORBIDDEN' };
    }

    // Compute smart button summary data
    const activeContract = emp.contracts.find((c) => c.status === 'ACTIVE');
    const totalRemainingLeaves = emp.timeOffAllocations.reduce((acc, a) => acc + a.remainingDays, 0);
    const presentCount = emp.attendance.filter((a) => a.status === 'PRESENT' || a.status === 'OVERTIME').length;
    const attendanceHealth = emp.attendance.length > 0 ? Math.round((presentCount / emp.attendance.length) * 100) : 100;

    return {
      ...emp,
      smartButtons: {
        contractsCount: emp.contracts.length,
        activeWage: activeContract ? activeContract.wage : 0,
        attendanceCount: emp.attendance.length,
        attendanceHealthPercent: attendanceHealth,
        timeOffRemainingDays: totalRemainingLeaves,
        payslipsCount: emp.payslips.length,
      },
    };
  }

  async createEmployee(data, user) {
    const existingEmpId = await employeeRepository.findByEmployeeId(data.employeeId);
    if (existingEmpId) {
      throw { statusCode: 409, message: `Employee ID "${data.employeeId}" is already taken.`, code: 'DUPLICATE_ID' };
    }

    const created = await employeeRepository.create(data);

    // Automatically initialize default leave allocations (20 Paid leaves, 10 Sick leaves)
    const leaveTypes = await prisma.timeOffType.findMany();
    for (const lt of leaveTypes) {
      const defaultDays = lt.name.toLowerCase().includes('sick') ? 10 : 20;
      await prisma.timeOffAllocation.create({
        data: {
          employeeId: created.id,
          timeOffTypeId: lt.id,
          allocatedDays: defaultDays,
          takenDays: 0,
          remainingDays: defaultDays,
          year: new Date().getFullYear(),
        },
      });
    }

    // If initial contract details are provided, create active contract automatically
    if (data.initialWage && data.salaryStructureId) {
      const contractRepo = require('../contracts/contract.repository');
      await contractRepo.create({
        employeeId: created.id,
        wage: parseFloat(data.initialWage),
        salaryStructureId: parseInt(data.salaryStructureId, 10),
        startDate: data.joiningDate ? new Date(data.joiningDate) : new Date(),
        status: 'ACTIVE',
        notes: data.contractNotes || 'Initial employment contract on onboarding',
      });
    }

    await auditService.log({
      userId: user.id,
      action: 'EMPLOYEE_CREATED',
      entityName: 'Employee',
      entityId: String(created.id),
      previousValue: null,
      newValue: JSON.stringify(created),
    });

    employeeCache.clear();
    return created;
  }

  async updateEmployee(id, data, user) {
    const current = await employeeRepository.findById(id);
    if (!current) {
      throw { statusCode: 404, message: 'Employee not found.', code: 'EMPLOYEE_NOT_FOUND' };
    }

    const updated = await employeeRepository.update(id, data);

    await auditService.log({
      userId: user.id,
      action: 'EMPLOYEE_UPDATED',
      entityName: 'Employee',
      entityId: String(id),
      previousValue: JSON.stringify({ name: current.name, status: current.status }),
      newValue: JSON.stringify({ name: updated.name, status: updated.status }),
    });

    employeeCache.clear();
    return updated;
  }

  async deleteEmployee(id, user) {
    const numId = parseInt(id, 10);
    const current = await employeeRepository.findById(numId);
    if (!current) {
      throw { statusCode: 404, message: 'Employee not found.', code: 'EMPLOYEE_NOT_FOUND' };
    }

    const payslipsCount = await prisma.payslip.count({ where: { employeeId: numId } });
    if (payslipsCount > 0) {
      const updated = await employeeRepository.update(numId, { status: 'TERMINATED' });
      await auditService.log({
        userId: user.id,
        action: 'EMPLOYEE_TERMINATED',
        entityName: 'Employee',
        entityId: String(numId),
        previousValue: JSON.stringify({ status: current.status }),
        newValue: JSON.stringify({ status: 'TERMINATED' }),
      });
      employeeCache.clear();
      return {
        message: `Employee has ${payslipsCount} historical payslips. Status changed to TERMINATED to protect payroll audit integrity.`,
        archived: true,
        employee: updated,
      };
    }

    await employeeRepository.delete(numId);

    await auditService.log({
      userId: user.id,
      action: 'EMPLOYEE_DELETED',
      entityName: 'Employee',
      entityId: String(numId),
      previousValue: JSON.stringify(current),
      newValue: null,
    });

    return { message: 'Employee deleted successfully.' };
  }

  async getSubordinateIdsForUser(user) {
    if (!user || user.role === 'ADMIN') return null; // Global access
    if (user.role === 'EMPLOYEE') {
      return user.employeeId ? [user.employeeId] : [];
    }

    if (!user.employeeId) return null;

    // Find direct subordinates
    const subs = await prisma.employee.findMany({
      where: { managerId: user.employeeId },
      select: { id: true },
    });

    return subs.map((s) => s.id);
  }
}

module.exports = new EmployeeService();
