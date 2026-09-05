const fs = require('fs');
const path = require('path');
const employeeService = require('./employee.service');
const employeeRepository = require('./employee.repository');
const auditService = require('../audit/audit.service');

const DATA_DIR = path.join(__dirname, '../../../data');
const DATA_FILE = path.join(DATA_DIR, 'profile-requests.json');

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

function readRequests() {
  ensureDataFile();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw) || [];
  } catch (err) {
    console.error('Error reading profile requests:', err);
    return [];
  }
}

function writeRequests(data) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

class ProfileRequestService {
  async createRequest(data, user) {
    const empId = user.employeeId;
    if (!empId) {
      throw { statusCode: 400, message: 'You must have an employee profile to submit a profile change request.', code: 'NO_EMPLOYEE' };
    }

    const employee = await employeeService.getEmployeeById(empId, user);
    const requests = readRequests();

    const newRequest = {
      id: Date.now(),
      employeeId: empId,
      employeeName: employee.name,
      employeeRef: employee.employeeId,
      departmentName: employee.department?.name || 'General',
      currentData: {
        name: employee.name || '',
        email: employee.email || '',
        phone: employee.phone || '',
        bankName: employee.bankName || '',
        bankAccountNumber: employee.bankAccountNumber || '',
        bankIfscCode: employee.bankIfscCode || '',
        panNumber: employee.panNumber || '',
      },
      requestedChanges: {
        ...(data.requestedChanges?.name !== undefined && { name: data.requestedChanges.name }),
        ...(data.requestedChanges?.email !== undefined && { email: data.requestedChanges.email }),
        ...(data.requestedChanges?.phone !== undefined && { phone: data.requestedChanges.phone }),
        ...(data.requestedChanges?.bankName !== undefined && { bankName: data.requestedChanges.bankName }),
        ...(data.requestedChanges?.bankAccountNumber !== undefined && { bankAccountNumber: data.requestedChanges.bankAccountNumber }),
        ...(data.requestedChanges?.bankIfscCode !== undefined && { bankIfscCode: data.requestedChanges.bankIfscCode }),
        ...(data.requestedChanges?.panNumber !== undefined && { panNumber: data.requestedChanges.panNumber }),
      },
      reason: data.reason || 'Employee requested profile details update',
      status: 'PENDING', // PENDING | APPROVED | REJECTED
      createdAt: new Date().toISOString(),
      reviewedAt: null,
      reviewedById: null,
      reviewedByName: null,
      reviewNotes: null,
    };

    requests.unshift(newRequest);
    writeRequests(requests);

    await auditService.log({
      userId: user.id,
      action: 'PROFILE_CHANGE_REQUEST_CREATED',
      entityName: 'Employee',
      entityId: String(empId),
      previousValue: null,
      newValue: JSON.stringify(newRequest.requestedChanges),
    });

    return newRequest;
  }

  async getAllRequests(query, user) {
    const rawRequests = readRequests();
    const formatted = rawRequests.map(r => ({
      ...r,
      employee: {
        id: r.employeeId,
        employeeId: r.employeeRef,
        name: r.employeeName,
        department: { name: r.departmentName || 'General' },
      },
    }));

    let result = formatted;
    if (user.role === 'EMPLOYEE') {
      result = result.filter(r => r.employeeId === user.employeeId);
    } else if (user && user.role === 'HR_MANAGER' && query?.scope !== 'all') {
      const employeeService = require('./employee.service');
      const subIds = await employeeService.getSubordinateIdsForUser(user);
      if (subIds !== null) {
        result = result.filter(r => subIds.includes(r.employeeId));
      }
    }

    if (query?.status) {
      result = result.filter(r => r.status === query.status);
    }
    return result;
  }

  async approveRequest(id, user) {
    const requests = readRequests();
    const reqIndex = requests.findIndex(r => String(r.id) === String(id));
    if (reqIndex === -1) {
      throw { statusCode: 404, message: 'Profile change request not found.', code: 'NOT_FOUND' };
    }

    const targetReq = requests[reqIndex];
    if (targetReq.status !== 'PENDING') {
      throw { statusCode: 400, message: `Request is already ${targetReq.status}.`, code: 'INVALID_STATUS' };
    }

    // Resolve employee: first by targetReq.employeeId, or fallback to targetReq.employeeRef ('EMP001')
    let emp = await employeeRepository.findById(targetReq.employeeId);
    if (!emp && targetReq.employeeRef) {
      emp = await employeeRepository.findByEmployeeId(targetReq.employeeRef);
    }
    if (!emp) {
      throw { statusCode: 404, message: 'Employee associated with this request not found.', code: 'EMPLOYEE_NOT_FOUND' };
    }

    // Apply the changes to the employee database!
    await employeeService.updateEmployee(emp.id, targetReq.requestedChanges, user);

    // If name or email changed, also keep associated User account in sync!
    if (targetReq.requestedChanges.name || targetReq.requestedChanges.email) {
      try {
        const prisma = require('../../config/database');
        const userSyncData = {};
        if (targetReq.requestedChanges.name) userSyncData.name = targetReq.requestedChanges.name;
        if (targetReq.requestedChanges.email) userSyncData.email = targetReq.requestedChanges.email.toLowerCase();
        await prisma.user.updateMany({
          where: { employeeId: emp.id },
          data: userSyncData,
        });
      } catch (syncErr) {
        console.warn('[ProfileRequestService] User account sync notice:', syncErr.message);
      }
    }

    targetReq.status = 'APPROVED';
    targetReq.employeeId = emp.id;
    targetReq.reviewedAt = new Date().toISOString();
    targetReq.reviewedById = user.id;
    targetReq.reviewedByName = user.name;
    targetReq.reviewNotes = 'Approved by HR Manager';

    requests[reqIndex] = targetReq;
    writeRequests(requests);

    await auditService.log({
      userId: user.id,
      action: 'PROFILE_CHANGE_REQUEST_APPROVED',
      entityName: 'Employee',
      entityId: String(emp.id),
      previousValue: JSON.stringify(targetReq.currentData),
      newValue: JSON.stringify(targetReq.requestedChanges),
    });

    return targetReq;
  }

  async rejectRequest(id, reason, user) {
    const requests = readRequests();
    const reqIndex = requests.findIndex(r => String(r.id) === String(id));
    if (reqIndex === -1) {
      throw { statusCode: 404, message: 'Profile change request not found.', code: 'NOT_FOUND' };
    }

    const targetReq = requests[reqIndex];
    if (targetReq.status !== 'PENDING') {
      throw { statusCode: 400, message: `Request is already ${targetReq.status}.`, code: 'INVALID_STATUS' };
    }

    targetReq.status = 'REJECTED';
    targetReq.reviewedAt = new Date().toISOString();
    targetReq.reviewedById = user.id;
    targetReq.reviewedByName = user.name;
    targetReq.reviewNotes = reason || 'Rejected by HR Manager';

    requests[reqIndex] = targetReq;
    writeRequests(requests);

    await auditService.log({
      userId: user.id,
      action: 'PROFILE_CHANGE_REQUEST_REJECTED',
      entityName: 'Employee',
      entityId: String(targetReq.employeeId),
      previousValue: JSON.stringify(targetReq.requestedChanges),
      newValue: JSON.stringify({ status: 'REJECTED', reason: targetReq.reviewNotes }),
    });

    return targetReq;
  }
}

module.exports = new ProfileRequestService();
