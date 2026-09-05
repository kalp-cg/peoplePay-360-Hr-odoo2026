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
        phone: employee.phone || '',
        bankName: employee.bankName || '',
        bankAccountNumber: employee.bankAccountNumber || '',
        bankIfscCode: employee.bankIfscCode || '',
        panNumber: employee.panNumber || '',
      },
      requestedChanges: {
        phone: data.requestedChanges?.phone ?? employee.phone,
        bankName: data.requestedChanges?.bankName ?? employee.bankName,
        bankAccountNumber: data.requestedChanges?.bankAccountNumber ?? employee.bankAccountNumber,
        bankIfscCode: data.requestedChanges?.bankIfscCode ?? employee.bankIfscCode,
        panNumber: data.requestedChanges?.panNumber ?? employee.panNumber,
      },
      reason: data.reason || 'Employee requested personal/bank details update',
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
    const requests = readRequests();
    if (user.role === 'EMPLOYEE') {
      return requests.filter(r => r.employeeId === user.employeeId);
    }
    if (query?.status) {
      return requests.filter(r => r.status === query.status);
    }
    return requests;
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
