const attendanceRepository = require('./attendance.repository');
const auditService = require('../audit/audit.service');
const prisma = require('../../config/database');

function calculateWorkedHours(checkIn, checkOut, breakHours = 1.0) {
  if (!checkIn || !checkOut) return 0;
  const inMs = new Date(checkIn).getTime();
  const outMs = new Date(checkOut).getTime();
  const rawHours = (outMs - inMs) / (1000 * 60 * 60);
  if (rawHours <= 0) return 0;
  
  // Deduct meal break only if worked 5 or more hours and rawHours exceeds breakHours
  const actualBreak = (rawHours >= 5.0 && rawHours > breakHours) ? breakHours : 0;
  const netHours = Math.max(0.01, rawHours - actualBreak);
  return Math.round(netHours * 100) / 100;
}

function getStartOfTodayLocal(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  const start = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  const end = new Date(`${year}-${month}-${day}T23:59:59.999Z`);
  return { start, end, dateString: `${year}-${month}-${day}` };
}

async function getEmployeeScheduleDay(employeeId, date) {
  try {
    const emp = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: {
        workingSchedule: {
          include: { scheduleDays: true },
        },
      },
    });

    if (emp?.workingSchedule?.scheduleDays?.length > 0) {
      const dayOfWeek = date.getDay();
      const matchedDay = emp.workingSchedule.scheduleDays.find((d) => d.dayOfWeek === dayOfWeek);
      if (matchedDay) return matchedDay;
    }
  } catch (err) {
    console.warn('[AttendanceService] Schedule resolution fallback:', err.message);
  }
  return { startTime: '09:00', endTime: '18:00', breakHours: 1.0, dailyHours: 8.0 };
}

function resolveAttendanceStatus(workedHours, dailyTarget, wasLate) {
  const target = dailyTarget || 8.0;
  if (workedHours >= target + 0.99) {
    return 'OVERTIME';
  }
  if (wasLate) {
    return 'LATE';
  }
  if (workedHours >= Math.max(1, target - 1.0)) {
    return 'PRESENT';
  }
  return 'PRESENT';
}

class AttendanceService {
  async getAttendance(query, user) {
    if (user.role === 'EMPLOYEE' && user.employeeId) {
      query.employeeId = user.employeeId;
    }
    return attendanceRepository.findAll(query);
  }

  async recordAttendance(data, user) {
    let empId = data.employeeId ? parseInt(data.employeeId, 10) : user.employeeId;
    if (user.role === 'EMPLOYEE') {
      empId = user.employeeId;
    }

    if (!empId) {
      throw { statusCode: 400, message: 'Employee ID is required.', code: 'MISSING_EMPLOYEE' };
    }

    const { start: date } = getStartOfTodayLocal(data.date);
    const existing = await attendanceRepository.findByEmployeeAndDate(empId, date);
    const scheduleDay = await getEmployeeScheduleDay(empId, date);

    if (existing) {
      const checkOut = data.checkOut ? new Date(data.checkOut) : new Date();
      const breakHours = data.breakHours !== undefined ? parseFloat(data.breakHours) : (existing.breakHours || scheduleDay.breakHours || 1.0);
      const worked = calculateWorkedHours(existing.checkIn, checkOut, breakHours);
      const wasLate = existing.status === 'LATE';
      const status = resolveAttendanceStatus(worked, scheduleDay.dailyHours, wasLate);

      return attendanceRepository.update(existing.id, {
        checkOut,
        breakHours,
        workedHours: worked,
        status,
      });
    }

    const checkIn = data.checkIn ? new Date(data.checkIn) : new Date();
    const hours = checkIn.getHours();
    const minutes = checkIn.getMinutes();
    const checkInMin = hours * 60 + minutes;

    // Grace period of 15 minutes past scheduled start time
    const [schedH, schedM] = (scheduleDay.startTime || '09:00').split(':').map(Number);
    const schedGraceMin = schedH * 60 + schedM + 15;

    let status = 'INCOMPLETE';
    if (checkInMin > schedGraceMin) {
      status = 'LATE';
    } else {
      status = 'PRESENT';
    }

    return attendanceRepository.create({
      employeeId: empId,
      date,
      checkIn,
      checkOut: null,
      breakHours: scheduleDay.breakHours || 1.0,
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
    let empId = user.employeeId;
    if (!empId) {
      const matchedEmp = await prisma.employee.findFirst({
        where: { OR: [{ email: user.email }, { employeeId: 'EMP000' }, { status: 'ACTIVE' }] },
        orderBy: { id: 'asc' },
      });
      if (matchedEmp) {
        empId = matchedEmp.id;
        user.employeeId = matchedEmp.id;
      }
    }

    if (!empId) {
      return { hasEmployeeProfile: false, checkedIn: false, record: null };
    }

    const numericEmpId = parseInt(user.employeeId, 10);

    // 1. Check for any active unclosed check-in (checkOut is null)
    const openRecord = await attendanceRepository.findOpenRecord(numericEmpId);

    if (openRecord && openRecord.checkIn) {
      const now = Date.now();
      const inMs = new Date(openRecord.checkIn).getTime();
      const diffHours = Math.max(0.01, Math.round(((now - inMs) / (1000 * 60 * 60)) * 100) / 100);

      return {
        hasEmployeeProfile: true,
        checkedIn: true,
        hasCheckedInToday: true,
        hasCheckedOutToday: false,
        checkInTime: openRecord.checkIn,
        checkOutTime: null,
        elapsedHours: diffHours,
        workedHours: openRecord.workedHours || 0,
        breakHours: openRecord.breakHours || 1.0,
        status: openRecord.status,
        record: openRecord,
      };
    }

    // 2. No open session -> Check for today's completed attendance record
    const { start: todayStart, dateString: todayStr } = getStartOfTodayLocal();
    let todayRecord = await attendanceRepository.findByEmployeeAndDate(numericEmpId, todayStart);

    if (!todayRecord) {
      const latest = await attendanceRepository.findLatestRecord(numericEmpId);
      if (latest && latest.checkIn) {
        const dateStr = getStartOfTodayLocal(latest.date).dateString;
        const checkInStr = getStartOfTodayLocal(latest.checkIn).dateString;
        if (dateStr === todayStr || checkInStr === todayStr) {
          todayRecord = latest;
        }
      }
    }

    if (todayRecord && todayRecord.checkIn) {
      return {
        hasEmployeeProfile: true,
        checkedIn: false,
        hasCheckedInToday: true,
        hasCheckedOutToday: Boolean(todayRecord.checkOut),
        checkInTime: todayRecord.checkIn,
        checkOutTime: todayRecord.checkOut,
        elapsedHours: todayRecord.workedHours || 0,
        workedHours: todayRecord.workedHours || 0,
        breakHours: todayRecord.breakHours || 1.0,
        status: todayRecord.status,
        record: todayRecord,
      };
    }

    // 3. No records for today
    return {
      hasEmployeeProfile: true,
      checkedIn: false,
      hasCheckedInToday: false,
      hasCheckedOutToday: false,
      checkInTime: null,
      checkOutTime: null,
      elapsedHours: 0,
      workedHours: 0,
      breakHours: 1.0,
      status: 'OUT_OF_OFFICE',
      record: null,
    };
  }

  async quickToggle(user, explicitAction = null) {
    let empId = user.employeeId;
    if (!empId) {
      const matchedEmp = await prisma.employee.findFirst({
        where: { OR: [{ email: user.email }, { employeeId: 'EMP000' }, { status: 'ACTIVE' }] },
        orderBy: { id: 'asc' },
      });
      if (matchedEmp) {
        empId = matchedEmp.id;
        user.employeeId = matchedEmp.id;
        await prisma.user.update({
          where: { id: user.id },
          data: { employeeId: matchedEmp.id },
        }).catch(() => {});
      }
    }

    if (!empId) {
      throw { statusCode: 400, message: 'Current user has no associated employee profile.', code: 'NO_EMPLOYEE_PROFILE' };
    }

    const currentStatus = await this.getCurrentStatus(user);

    // If already in the desired state, return current record
    if (explicitAction === 'CHECK_IN' && currentStatus.checkedIn) {
      return currentStatus.record;
    }
    if (explicitAction === 'CHECK_OUT' && !currentStatus.checkedIn) {
      return currentStatus.record;
    }

    const shouldCheckIn = explicitAction ? explicitAction === 'CHECK_IN' : !currentStatus.checkedIn;

    if (shouldCheckIn) {
      // User is not checked in -> Trigger Check In!
      if (currentStatus.record && currentStatus.record.checkOut) {
        // Secondary check-in / Resume shift: preserve previously logged hours
        const previousWorkedHours = currentStatus.record.workedHours || 0;
        const previousWorkedMs = previousWorkedHours * 3600000;
        const adjustedCheckIn = new Date(Date.now() - Math.round(previousWorkedMs));

        return attendanceRepository.update(currentStatus.record.id, {
          checkIn: adjustedCheckIn,
          checkOut: null,
          status: currentStatus.record.status === 'LATE' ? 'LATE' : 'PRESENT',
        });
      } else {
        // First check in of the day
        return this.recordAttendance({ employeeId: empId, checkIn: new Date() }, user);
      }
    } else {
      // User is currently checked in -> Trigger Check Out!
      if (!currentStatus.record || !currentStatus.record.checkIn) {
        return null;
      }
      const checkOutTime = new Date();
      const existing = currentStatus.record;
      const today = new Date();
      const scheduleDay = await getEmployeeScheduleDay(empId, today);
      const breakHours = existing?.breakHours !== undefined ? existing.breakHours : (scheduleDay.breakHours || 1.0);
      const worked = calculateWorkedHours(existing.checkIn, checkOutTime, breakHours);
      const wasLate = existing.status === 'LATE';
      const status = resolveAttendanceStatus(worked, scheduleDay.dailyHours, wasLate);

      return attendanceRepository.update(existing.id, {
        checkOut: checkOutTime,
        workedHours: worked,
        status,
      });
    }
  }
}

module.exports = new AttendanceService();
