const prisma = require('../../config/database');
const { paginate, paginateResult } = require('../../utils/paginate');

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

  async findAll({ action, entityName, search, page, limit } = {}) {
    const where = {};
    if (action) where.action = action;
    if (entityName) where.entityName = entityName;
    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { action: { contains: q, mode: 'insensitive' } },
        { entityName: { contains: q, mode: 'insensitive' } },
        { entityId: { contains: q, mode: 'insensitive' } },
        { user: { name: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
      ];
    }

    const { page: p, limit: l, skip } = paginate({ page, limit: limit || 50 });

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
        orderBy: { timestamp: 'desc' },
        skip,
        take: l,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return paginateResult(data, total, p, l);
  }
}

module.exports = new AuditRepository();
