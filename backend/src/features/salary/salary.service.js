const salaryRepository = require('./salary.repository');
const auditService = require('../audit/audit.service');
const { validateRule } = require('./salary.validator');

class SalaryService {
  async getStructures() {
    return salaryRepository.getStructures();
  }

  async getStructureById(id) {
    const s = await salaryRepository.getStructureById(id);
    if (!s) {
      throw { statusCode: 404, message: 'Salary structure not found.', code: 'NOT_FOUND' };
    }
    return s;
  }

  async createStructure(data, user) {
    const created = await salaryRepository.createStructure(data);
    await auditService.log({
      userId: user.id,
      action: 'SALARY_STRUCTURE_CREATED',
      entityName: 'SalaryStructure',
      entityId: String(created.id),
      previousValue: null,
      newValue: JSON.stringify(created),
    });
    return created;
  }

  async updateStructure(id, data, user) {
    const current = await salaryRepository.getStructureById(id);
    if (!current) {
      throw { statusCode: 404, message: 'Salary structure not found.', code: 'NOT_FOUND' };
    }
    const updated = await salaryRepository.updateStructure(id, data);
    await auditService.log({
      userId: user.id,
      action: 'SALARY_STRUCTURE_UPDATED',
      entityName: 'SalaryStructure',
      entityId: String(id),
      previousValue: JSON.stringify({ name: current.name }),
      newValue: JSON.stringify({ name: updated.name }),
    });
    return updated;
  }

  async getRules(query) {
    return salaryRepository.getRules(query);
  }

  async createRule(data, user) {
    // Reject an unusable code or formula here rather than letting it silently
    // evaluate to zero on every payslip this structure touches.
    await validateRule(data);
    const created = await salaryRepository.createRule(data);
    await auditService.log({
      userId: user.id,
      action: 'SALARY_RULE_CREATED',
      entityName: 'SalaryRule',
      entityId: String(created.id),
      previousValue: null,
      newValue: JSON.stringify({ code: created.code, sequence: created.sequence, expr: created.valueExpression }),
    });
    return created;
  }

  async updateRule(id, data, user) {
    const current = await salaryRepository.getRuleById(id);
    if (!current) {
      throw { statusCode: 404, message: 'Salary rule not found.', code: 'NOT_FOUND' };
    }
    await validateRule(data, current);
    const updated = await salaryRepository.updateRule(id, data);
    await auditService.log({
      userId: user.id,
      action: 'SALARY_RULE_UPDATED',
      entityName: 'SalaryRule',
      entityId: String(id),
      previousValue: JSON.stringify({ code: current.code, expr: current.valueExpression }),
      newValue: JSON.stringify({ code: updated.code, expr: updated.valueExpression }),
    });
    return updated;
  }
}

module.exports = new SalaryService();
