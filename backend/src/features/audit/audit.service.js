const auditRepository = require('./audit.repository');
const logger = require('../../utils/logger');

class AuditService {
  async log({ userId, action, entityName, entityId, previousValue, newValue }) {
    try {
      return await auditRepository.createLog({
        userId,
        action,
        entityName,
        entityId,
        previousValue,
        newValue,
      });
    } catch (err) {
      // Don't crash main operation if audit logging fails, but log error
      logger.error('Failed to create audit log:', err);
      return null;
    }
  }

  async getLogs(query) {
    return auditRepository.findAll(query);
  }
}

module.exports = new AuditService();
