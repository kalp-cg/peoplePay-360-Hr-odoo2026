const timeOffRepository = require('./timeoff.repository');
const auditService = require('../audit/audit.service');
const prisma = require('../../config/database');

class TimeOffService {
  async getTypes() {
    return timeOffRepository.getTypes();
  }

  async createType(data) {
    return timeOffRepository.createType(data);
  }

  async getAllocations(query, user) {
    const q = { ...query };
    if (user.role === 'EMPLOYEE' && user.employeeId) {
      q.employeeId = user.employeeId;
    } else if (user && user.role === 'HR_MANAGER' && q.scope !== 'all') {
      const employeeService = require('../employees/employee.service');
      const subIds = await employeeService.getSubordinateIdsForUser(user);
      if (subIds !== null) {
        q.subordinateIds = subIds;
      }
    }
    return timeOffRepository.getAllocations(q);
  }

  async createAllocation(data, user) {
    const created = await timeOffRepository.createAllocation(data);
    await auditService.log({
      userId: user.id,
      action: 'LEAVE_ALLOCATION_CREATED',
      entityName: 'TimeOffAllocation',
      entityId: String(created.id),
      previousValue: null,
      newValue: JSON.stringify({ employeeId: created.employeeId, days: created.allocatedDays }),
    });
    return created;
  }

  async getRequests(query, user) {
    const q = { ...query };
    if (user.role === 'EMPLOYEE' && user.employeeId) {
      q.employeeId = user.employeeId;
    } else if (user && user.role === 'HR_MANAGER' && q.scope !== 'all') {
      const employeeService = require('../employees/employee.service');
      const subIds = await employeeService.getSubordinateIdsForUser(user);
      if (subIds !== null) {
        q.subordinateIds = subIds;
      }
    }
    return timeOffRepository.getRequests(q);
  }

  async submitRequest(data, user) {
    let empId = data.employeeId ? parseInt(data.employeeId, 10) : user.employeeId;
    if (user.role === 'EMPLOYEE') {
      empId = user.employeeId;
    }

    if (!empId) {
      throw { statusCode: 400, message: 'Employee ID is required.', code: 'MISSING_EMPLOYEE' };
    }

    // Check allocation balance if leave type requires allocation
    const leaveType = await prisma.timeOffType.findUnique({
      where: { id: parseInt(data.timeOffTypeId, 10) },
    });

    if (!leaveType) {
      throw { statusCode: 404, message: 'Time off type not found.', code: 'INVALID_LEAVE_TYPE' };
    }

    const duration = parseFloat(data.durationDays || 1.0);

    if (leaveType.allocationRequired) {
      const year = new Date(data.startDate).getFullYear();
      const allocation = await prisma.timeOffAllocation.findFirst({
        where: {
          employeeId: empId,
          timeOffTypeId: leaveType.id,
          year,
        },
      });

      if (!allocation || allocation.remainingDays < duration) {
        throw {
          statusCode: 400,
          message: `Insufficient leave balance. Remaining: ${allocation ? allocation.remainingDays : 0} days, requested: ${duration} days.`,
          code: 'INSUFFICIENT_BALANCE',
        };
      }
    }

    const request = await timeOffRepository.createRequest({
      ...data,
      employeeId: empId,
      durationDays: duration,
    });

    await auditService.log({
      userId: user.id,
      action: 'LEAVE_REQUEST_SUBMITTED',
      entityName: 'TimeOffRequest',
      entityId: String(request.id),
      previousValue: null,
      newValue: JSON.stringify({ employeeId: empId, durationDays: duration, type: leaveType.name }),
    });

    return request;
  }

  async approveRequest(id, user) {
    const approved = await timeOffRepository.approveRequest(id, user.id);

    await auditService.log({
      userId: user.id,
      action: 'LEAVE_APPROVED',
      entityName: 'TimeOffRequest',
      entityId: String(id),
      previousValue: JSON.stringify({ status: 'PENDING' }),
      newValue: JSON.stringify({ status: 'APPROVED', approvedBy: user.email }),
    });

    return approved;
  }

  async rejectRequest(id, rejectionReason, user) {
    const rejected = await timeOffRepository.rejectRequest(id, rejectionReason);

    await auditService.log({
      userId: user.id,
      action: 'LEAVE_REJECTED',
      entityName: 'TimeOffRequest',
      entityId: String(id),
      previousValue: JSON.stringify({ status: 'PENDING' }),
      newValue: JSON.stringify({ status: 'REJECTED', reason: rejectionReason }),
    });

    return rejected;
  }
}

module.exports = new TimeOffService();
