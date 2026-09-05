const prisma = require('../../config/database');

class AuditRepository {
  async createLog({ userId, action, entityName, entityId, previousValue, newValue }) {
    return prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        entityName,
        entityId: entityId ? String(entityId) : null,
        previousValue: previousValue ? String(previousValue) : null,
        newValue: newValue ? String(newValue) : null,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
  }

  async findAll({ action, entityName, limit = 50 }) {
    const where = {};
    if (action) where.action = action;
    if (entityName) where.entityName = entityName;

    return prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: parseInt(limit, 10),
    });
  }
}

module.exports = new AuditRepository();
