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
    const newStartDate = new Date(data.startDate);

    // Overlap prevention & Automatic Expiration:
    // If the new contract is ACTIVE (or status not specified), close all existing active contracts for this employee
    if (data.status === 'ACTIVE' || !data.status) {
      const activeContracts = await prisma.contract.findMany({
        where: {
          employeeId: empId,
          status: 'ACTIVE',
        },
      });

      for (const oldContract of activeContracts) {
        // Calculate the day immediately before the new contract's start date
        const dayBefore = new Date(newStartDate);
        dayBefore.setDate(dayBefore.getDate() - 1);

        // Ensure endDate is never before oldContract's startDate
        let finalEndDate = dayBefore;
        if (finalEndDate < new Date(oldContract.startDate)) {
          finalEndDate = new Date(oldContract.startDate);
        }

        const dateFormatted = finalEndDate.toISOString().slice(0, 10);
        const autoNote = `[Automatically closed on ${dateFormatted} upon activation of new contract]`;
        const updatedNotes = oldContract.notes ? `${oldContract.notes} ${autoNote}` : autoNote;

        await prisma.contract.update({
          where: { id: oldContract.id },
          data: {
            endDate: finalEndDate,
            status: 'EXPIRED',
            notes: updatedNotes,
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
