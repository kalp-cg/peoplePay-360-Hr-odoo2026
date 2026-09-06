const prisma = require('../../config/database');
const { paginate, paginateResult } = require('../../utils/paginate');

class TimeOffRepository {
  async getTypes() {
    return prisma.timeOffType.findMany({
      orderBy: { id: 'asc' },
    });
  }

  async createType(data) {
    return prisma.timeOffType.create({ data });
  }

  async getAllocations({ employeeId, year, page, limit } = {}) {
    const where = {};
    if (employeeId) where.employeeId = parseInt(employeeId, 10);
    if (year) where.year = parseInt(year, 10);

    const { page: p, limit: l, skip } = paginate({ page, limit: limit || 50 });

    const [data, total] = await Promise.all([
      prisma.timeOffAllocation.findMany({
        where,
        include: {
          employee: {
            select: { id: true, employeeId: true, name: true, department: true },
          },
          timeOffType: true,
        },
        orderBy: { id: 'asc' },
        skip,
        take: l,
      }),
      prisma.timeOffAllocation.count({ where }),
    ]);

    return paginateResult(data, total, p, l);
  }

  async createAllocation(data) {
    const allocated = parseFloat(data.allocatedDays);
    return prisma.timeOffAllocation.create({
      data: {
        employeeId: parseInt(data.employeeId, 10),
        timeOffTypeId: parseInt(data.timeOffTypeId, 10),
        allocatedDays: allocated,
        takenDays: 0,
        remainingDays: allocated,
        year: data.year ? parseInt(data.year, 10) : new Date().getFullYear(),
      },
      include: {
        employee: true,
        timeOffType: true,
      },
    });
  }

  async getRequests({ employeeId, status, subordinateIds, page, limit } = {}) {
    const where = {};
    if (employeeId) where.employeeId = parseInt(employeeId, 10);
    if (status) where.status = status;
    if (subordinateIds && Array.isArray(subordinateIds)) {
      where.employeeId = { in: subordinateIds.length > 0 ? subordinateIds : [-1] };
    }

    const { page: p, limit: l, skip } = paginate({ page, limit: limit || 25 });

    const [data, total] = await Promise.all([
      prisma.timeOffRequest.findMany({
        where,
        include: {
          employee: {
            select: { id: true, employeeId: true, name: true, department: true },
          },
          timeOffType: true,
          approvedBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: l,
      }),
      prisma.timeOffRequest.count({ where }),
    ]);

    return paginateResult(data, total, p, l);
  }

  async getRequestById(id) {
    return prisma.timeOffRequest.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        employee: true,
        timeOffType: true,
        approvedBy: true,
      },
    });
  }

  async createRequest(data) {
    return prisma.timeOffRequest.create({
      data: {
        employeeId: parseInt(data.employeeId, 10),
        timeOffTypeId: parseInt(data.timeOffTypeId, 10),
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        durationDays: parseFloat(data.durationDays || 1.0),
        reason: data.reason || null,
        status: 'PENDING',
      },
      include: {
        employee: true,
        timeOffType: true,
      },
    });
  }

  /**
   * CRITICAL BUSINESS RULE (PRD Section 10.2 & Section 30 Rule 4):
   * When approved:
   * Leave Request status -> APPROVED
   * Update Allocation -> Taken += duration, Remaining -= duration
   * Atomic PostgreSQL transaction!
   */
  async approveRequest(id, approvedById) {
    const numId = parseInt(id, 10);

    return prisma.$transaction(async (tx) => {
      const request = await tx.timeOffRequest.findUnique({
        where: { id: numId },
        include: { timeOffType: true },
      });

      if (!request) {
        throw { statusCode: 404, message: 'Time off request not found.', code: 'NOT_FOUND' };
      }

      if (request.status !== 'PENDING') {
        throw { statusCode: 400, message: `Cannot approve request in ${request.status} state.`, code: 'INVALID_STATE' };
      }

      // Update request status
      const updatedReq = await tx.timeOffRequest.update({
        where: { id: numId },
        data: {
          status: 'APPROVED',
          approvedById,
        },
        include: {
          employee: true,
          timeOffType: true,
          approvedBy: true,
        },
      });

      // If this leave type requires allocation tracking, update the allocation
      if (request.timeOffType.allocationRequired) {
        const year = new Date(request.startDate).getFullYear();
        const allocation = await tx.timeOffAllocation.findFirst({
          where: {
            employeeId: request.employeeId,
            timeOffTypeId: request.timeOffTypeId,
            year,
          },
        });

        if (allocation) {
          const newTaken = allocation.takenDays + request.durationDays;
          const newRemaining = Math.max(0, allocation.allocatedDays - newTaken);

          await tx.timeOffAllocation.update({
            where: { id: allocation.id },
            data: {
              takenDays: newTaken,
              remainingDays: newRemaining,
            },
          });
        }
      }

      return updatedReq;
    }, { maxWait: 20000, timeout: 60000 });
  }

  async rejectRequest(id, rejectionReason) {
    const numId = parseInt(id, 10);
    return prisma.timeOffRequest.update({
      where: { id: numId },
      data: {
        status: 'REJECTED',
        rejectionReason: rejectionReason || null,
      },
      include: {
        employee: true,
        timeOffType: true,
      },
    });
  }
}

module.exports = new TimeOffRepository();
