const contractRepository = require('./contract.repository');
const auditService = require('../audit/audit.service');
const prisma = require('../../config/database');

class ContractService {
  async getAllContracts(query) {
    return contractRepository.findAll(query);
  }

  async getContractById(id) {
    const contract = await contractRepository.findById(id);
    if (!contract) {
      throw { statusCode: 404, message: 'Contract not found.', code: 'CONTRACT_NOT_FOUND' };
    }
    return contract;
  }

  async findApplicableContract(employeeId, periodStart, periodEnd) {
    return contractRepository.findApplicableContract(employeeId, periodStart, periodEnd);
  }

  async createContract(data, user) {
    const empId = parseInt(data.employeeId, 10);
    const startDate = new Date(data.startDate);

    // Overlap prevention: If new contract is ACTIVE, check existing active contracts
    if (data.status === 'ACTIVE' || !data.status) {
      const existingActive = await prisma.contract.findFirst({
        where: {
          employeeId: empId,
          status: 'ACTIVE',
          OR: [
            { endDate: null },
            { endDate: { gte: startDate } },
          ],
        },
      });

      if (existingActive) {
        // Automatically expire or close the previous open-ended contract up to startDate - 1 day
        const dayBefore = new Date(startDate);
        dayBefore.setDate(dayBefore.getDate() - 1);
        await prisma.contract.update({
          where: { id: existingActive.id },
          data: {
            endDate: dayBefore,
            status: 'EXPIRED',
            notes: (existingActive.notes || '') + ' [Closed upon creation of new contract]',
          },
        });
      }
    }

    const created = await contractRepository.create(data);

    await auditService.log({
      userId: user.id,
      action: 'CONTRACT_CREATED',
      entityName: 'Contract',
      entityId: String(created.id),
      previousValue: null,
      newValue: JSON.stringify({ employeeId: empId, wage: created.wage, startDate: created.startDate }),
    });

    return created;
  }

  async updateContract(id, data, user) {
    const current = await contractRepository.findById(id);
    if (!current) {
      throw { statusCode: 404, message: 'Contract not found.', code: 'CONTRACT_NOT_FOUND' };
    }

    const updated = await contractRepository.update(id, data);

    await auditService.log({
      userId: user.id,
      action: 'CONTRACT_UPDATED',
      entityName: 'Contract',
      entityId: String(id),
      previousValue: JSON.stringify({ wage: current.wage, status: current.status }),
      newValue: JSON.stringify({ wage: updated.wage, status: updated.status }),
    });

    return updated;
  }
}

module.exports = new ContractService();
