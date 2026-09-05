const attendanceRepository = require('./attendance.repository');
const auditService = require('../audit/audit.service');

function calculateWorkedHours(checkIn, checkOut, breakHours = 1.0) {
  if (!checkIn || !checkOut) return 0;
  const inMs = new Date(checkIn).getTime();
  const outMs = new Date(checkOut).getTime();
  const rawHours = (outMs - inMs) / (1000 * 60 * 60);
  return Math.max(0, Math.round((rawHours - breakHours) * 100) / 100);
}

class AttendanceService {
  async getAttendance(query, user) {
    // If EMPLOYEE role, restrict to own attendance
    if (user.role === 'EMPLOYEE' && user.employeeId) {
      query.employeeId = user.employeeId;
    }
    return attendanceRepository.findAll(query);
  }

  async recordAttendance(data, user) {
    let empId = data.employeeId ? parseInt(data.employeeId, 10) : user.employeeId;
    if (user.role === 'EMPLOYEE') {
      empId = user.employeeId; // Force self
    }

    if (!empId) {
      throw { statusCode: 400, message: 'Employee ID is required.', code: 'MISSING_EMPLOYEE' };
    }

    const date = data.date ? new Date(data.date) : new Date();
    // Normalize date to midnight UTC/local
    date.setUTCHours(0, 0, 0, 0);

    const existing = await attendanceRepository.findByEmployeeAndDate(empId, date);

    if (existing) {
      // If check-out is being submitted
      const checkOut = data.checkOut ? new Date(data.checkOut) : new Date();
      const breakHours = data.breakHours !== undefined ? parseFloat(data.breakHours) : existing.breakHours;
      const worked = calculateWorkedHours(existing.checkIn, checkOut, breakHours);

      let status = existing.status;
      if (worked >= 9.0) {
        status = 'OVERTIME';
      } else if (worked >= 7.0 && status !== 'LATE') {
        status = 'PRESENT';
      }

      return attendanceRepository.update(existing.id, {
        checkOut,
        breakHours,
        workedHours: worked,
        status,
      });
    }

    // New check-in
    const checkIn = data.checkIn ? new Date(data.checkIn) : new Date();
    // Check if late (e.g., after 09:30)
    const hours = checkIn.getHours();
    const minutes = checkIn.getMinutes();
    let status = 'INCOMPLETE';
    if (hours > 9 || (hours === 9 && minutes > 30)) {
      status = 'LATE';
    }

    return attendanceRepository.create({
      employeeId: empId,
      date,
      checkIn,
      checkOut: null,
      breakHours: 1.0,
      workedHours: 0.0,
      status,
    });
  }

  async correctAttendance(id, data, user) {
    const current = await attendanceRepository.findById(id);
    if (!current) {
      throw { statusCode: 404, message: 'Attendance record not found.', code: 'NOT_FOUND' };
    }

    if (!data.correctionReason) {
      throw { statusCode: 400, message: 'A reason is mandatory for attendance corrections.', code: 'REASON_REQUIRED' };
    }

    const checkIn = data.checkIn ? new Date(data.checkIn) : current.checkIn;
    const checkOut = data.checkOut ? new Date(data.checkOut) : current.checkOut;
    const breakHours = data.breakHours !== undefined ? parseFloat(data.breakHours) : current.breakHours;
    const workedHours = calculateWorkedHours(checkIn, checkOut, breakHours);

    const updated = await attendanceRepository.update(id, {
      checkIn,
      checkOut,
      breakHours,
      workedHours,
      status: 'CORRECTED',
      correctionReason: data.correctionReason,
      correctedById: user.id,
    });

    await auditService.log({
      userId: user.id,
      action: 'ATTENDANCE_CORRECTED',
      entityName: 'Attendance',
      entityId: String(id),
      previousValue: JSON.stringify({ checkIn: current.checkIn, checkOut: current.checkOut, status: current.status }),
      newValue: JSON.stringify({ checkIn: updated.checkIn, checkOut: updated.checkOut, reason: data.correctionReason }),
    });

    return updated;
  }

  async getCurrentStatus(user) {
    if (!user.employeeId) {
      return { hasEmployeeProfile: false, checkedIn: false, record: null };
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const record = await attendanceRepository.findByEmployeeAndDate(user.employeeId, today);

    if (!record || !record.checkIn) {
      return {
        hasEmployeeProfile: true,
        checkedIn: false,
        checkInTime: null,
        elapsedHours: 0,
        record: null,
      };
    }

    const isCheckedOut = Boolean(record.checkOut);
    const now = new Date();
    const inTime = new Date(record.checkIn);
    const diffHours = Math.max(0, Math.round(((now.getTime() - inTime.getTime()) / (1000 * 60 * 60)) * 100) / 100);

    return {
      hasEmployeeProfile: true,
      checkedIn: !isCheckedOut,
      checkInTime: record.checkIn,
      checkOutTime: record.checkOut,
      elapsedHours: isCheckedOut ? record.workedHours : diffHours,
      status: record.status,
      record,
    };
  }

  async quickToggle(user) {
    if (!user.employeeId) {
      throw { statusCode: 400, message: 'Current user has no associated employee profile.', code: 'NO_EMPLOYEE_PROFILE' };
    }

    const currentStatus = await this.getCurrentStatus(user);

    if (!currentStatus.checkedIn && !currentStatus.record?.checkOut) {
      // Perform Check-in
      return this.recordAttendance({ employeeId: user.employeeId, checkIn: new Date() }, user);
    } else if (currentStatus.checkedIn) {
      // Perform Check-out
      return this.recordAttendance({ employeeId: user.employeeId, checkOut: new Date() }, user);
    } else {
      // Already completed check-out today, can re-open or update
      return this.recordAttendance({ employeeId: user.employeeId, checkOut: new Date() }, user);
    }
  }
}

module.exports = new AttendanceService();
