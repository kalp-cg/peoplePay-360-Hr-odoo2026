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

function resolveAttendanceStatus(workedHours, scheduleDay, wasLate, policy) {
  const fullTarget = policy?.fullDayHours || scheduleDay?.dailyHours || 7.0;
  const halfTarget = policy?.halfDayHours || 4.0;
  const otThreshold = policy?.overtimeThreshold || Math.max(9.0, fullTarget + 1.0);

  // 1. Overtime qualification
  if (workedHours >= otThreshold) {
    return 'OVERTIME';
  }

  // 2. Late check-in penalty: if employee was late, only full hours can keep them marked LATE; if less than half day, marked INCOMPLETE
  if (wasLate) {
    if (workedHours >= fullTarget) {
      return 'LATE';
    } else if (workedHours >= halfTarget) {
      return 'HALF_DAY';
    } else {
      return 'INCOMPLETE';
    }
  }

  // 3. Full Day qualification
  if (workedHours >= fullTarget) {
    return 'PRESENT';
  }

  // 4. Half Day qualification
  if (workedHours >= halfTarget) {
    return 'HALF_DAY';
  }

  // 5. Less than half day threshold -> Incomplete
  return 'INCOMPLETE';
}

class AttendanceService {
  async getAttendance(query, user) {
    const q = { ...query };
    if (user.role === 'EMPLOYEE' && user.employeeId) {
      q.employeeId = user.employeeId;
    } else if (user && user.role === 'HR_MANAGER' && q.scope !== 'all') {
      const employeeService = require('../employees/employee.service');
      const subIds = await employeeService.getSubordinateIdsForUser(user);
      if (subIds !== null) {
        q.subordinateIds = subIds;
      }
    }
    return attendanceRepository.findAll(q);
  }

  async recordAttendance(data, user) {
    let empId = null;
    if (user.role === 'EMPLOYEE') {
      empId = await this.resolveUserEmployeeId(user);
    } else {
      empId = data.employeeId ? parseInt(data.employeeId, 10) : await this.resolveUserEmployeeId(user);
    }

    if (!empId) {
      throw { statusCode: 400, message: 'Employee ID is required.', code: 'MISSING_EMPLOYEE' };
    }

    const policy = await attendanceRepository.getActivePolicy();
    const { start: date } = getStartOfTodayLocal(data.date);
    const existing = await attendanceRepository.findByEmployeeAndDate(empId, date);
    const scheduleDay = await getEmployeeScheduleDay(empId, date);

    if (existing) {
      if (data.checkIn && !data.checkOut) {
        // Secondary check-in / start fresh from 0
        return attendanceRepository.update(existing.id, {
          checkIn: new Date(data.checkIn),
          checkOut: null,
          workedHours: 0,
          status: 'PRESENT',
        });
      }

      const checkOut = data.checkOut ? new Date(data.checkOut) : new Date();
      const breakHours = data.breakHours !== undefined
        ? parseFloat(data.breakHours)
        : (existing.breakHours || policy.breakDeductionHours || scheduleDay.breakHours || 1.0);
      const worked = calculateWorkedHours(existing.checkIn, checkOut, breakHours);
      const wasLate = existing.status === 'LATE';
      const status = resolveAttendanceStatus(worked, scheduleDay, wasLate, policy);

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

    // Grace period from active policy past scheduled start time
    const [schedH, schedM] = (scheduleDay.startTime || '09:00').split(':').map(Number);
    const graceMins = policy?.gracePeriodMins ?? 15;
    const schedGraceMin = schedH * 60 + schedM + graceMins;

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
      breakHours: policy.breakDeductionHours || scheduleDay.breakHours || 1.0,
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

  async resolveUserEmployeeId(user) {
    if (user?.employeeId) {
      return parseInt(user.employeeId, 10);
    }
    if (!user) return null;

    // Strict lookup: only an employee record with this user's exact email
    let emp = await prisma.employee.findUnique({
      where: { email: user.email },
    });

    // If user is ADMIN and has no employee profile, provision EMP000 dedicated to admin
    if (!emp && user.role === 'ADMIN') {
      const defaultDept = await prisma.department.findFirst({ where: { code: 'OPS' } }) ||
                          await prisma.department.findFirst();
      const defaultJob = await prisma.jobPosition.findFirst({ where: { departmentId: defaultDept?.id } }) ||
                         await prisma.jobPosition.findFirst();
      const defaultSched = await prisma.workingSchedule.findFirst();

      emp = await prisma.employee.create({
        data: {
          employeeId: 'EMP000',
          name: user.name || 'System Administrator',
          email: user.email,
          phone: '+91 9800000000',
          departmentId: defaultDept ? defaultDept.id : 1,
          jobPositionId: defaultJob ? defaultJob.id : 1,
          employeeType: 'FULL_TIME',
          joiningDate: new Date('2024-01-01'),
          status: 'ACTIVE',
          workingScheduleId: defaultSched ? defaultSched.id : null,
          bankAccountNumber: '999900001111',
          bankName: 'HDFC Bank',
          bankIfscCode: 'HDFC0000123',
          panNumber: 'ADMPA0000Z',
        },
      });

      // Provide leave allocation defaults for EMP000
      const timeOffTypes = await prisma.timeOffType.findMany().catch(() => []);
      for (const tot of timeOffTypes) {
        await prisma.timeOffAllocation.create({
          data: {
            employeeId: emp.id,
            timeOffTypeId: tot.id,
            allocatedDays: tot.name.toLowerCase().includes('sick') ? 12 : 24,
            takenDays: 0,
            remainingDays: tot.name.toLowerCase().includes('sick') ? 12 : 24,
            year: 2026,
          },
        }).catch(() => {});
      }
    }

    if (emp) {
      await prisma.user.update({
        where: { id: user.id },
        data: { employeeId: emp.id },
      }).catch(() => {});
      user.employeeId = emp.id;
      return emp.id;
    }

    return null;
  }

  async getCurrentStatus(user) {
    const numericEmpId = await this.resolveUserEmployeeId(user);

    if (!numericEmpId) {
      return {
        hasEmployeeProfile: false,
        checkedIn: false,
        hasCheckedInToday: false,
        hasCheckedOutToday: false,
        checkInTime: null,
        checkOutTime: null,
        elapsedHours: 0,
        workedHours: 0,
        breakHours: 0,
        status: 'OUT_OF_OFFICE',
        record: null,
      };
    }

    // 1. Check for any active unclosed check-in (checkOut is null)
    const openRecord = await attendanceRepository.findOpenRecord(numericEmpId);

    if (openRecord && openRecord.checkIn) {
      const policy = await attendanceRepository.getActivePolicy();
      const now = Date.now();
      const inMs = new Date(openRecord.checkIn).getTime();
      const rawHours = (now - inMs) / (1000 * 60 * 60);
      const maxCap = policy?.maxShiftHoursCap || 14.0;
      const diffHours = Math.max(0.01, Math.round(Math.min(rawHours, maxCap) * 100) / 100);

      return {
        hasEmployeeProfile: true,
        checkedIn: true,
        isCapped: rawHours > maxCap,
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
    const empId = await this.resolveUserEmployeeId(user);

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
        // Checking in again after check-out: start clock fresh from 0 at current timestamp!
        const now = new Date();
        return attendanceRepository.update(currentStatus.record.id, {
          checkIn: now,
          checkOut: null,
          workedHours: 0,
          status: 'PRESENT',
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
      const policy = await attendanceRepository.getActivePolicy();
      const scheduleDay = await getEmployeeScheduleDay(empId, today);
      const breakHours = existing?.breakHours !== undefined
        ? existing.breakHours
        : (policy.breakDeductionHours || scheduleDay.breakHours || 1.0);
      const worked = calculateWorkedHours(existing.checkIn, checkOutTime, breakHours);
      const wasLate = existing.status === 'LATE';
      const status = resolveAttendanceStatus(worked, scheduleDay, wasLate, policy);

      return attendanceRepository.update(existing.id, {
        checkOut: checkOutTime,
        workedHours: worked,
        status,
      });
    }
  }

  async getPolicy() {
    return attendanceRepository.getActivePolicy();
  }

  async updatePolicy(data, user) {
    const fullDay = data.fullDayHours !== undefined ? parseFloat(data.fullDayHours) : 7.0;
    const halfDay = data.halfDayHours !== undefined ? parseFloat(data.halfDayHours) : 4.0;
    const overtime = data.overtimeThreshold !== undefined ? parseFloat(data.overtimeThreshold) : 9.0;
    const graceMins = data.gracePeriodMins !== undefined ? parseInt(data.gracePeriodMins, 10) : 15;

    if (halfDay <= 0) {
      throw { statusCode: 400, message: 'Half Day threshold must be greater than 0 hours.', code: 'INVALID_THRESHOLD' };
    }
    if (fullDay <= halfDay) {
      throw { statusCode: 400, message: 'Full Day threshold must be greater than Half Day threshold.', code: 'INVALID_THRESHOLD' };
    }
    if (overtime < fullDay) {
      throw { statusCode: 400, message: 'Overtime threshold must be greater than or equal to Full Day target.', code: 'INVALID_THRESHOLD' };
    }
    if (graceMins < 0) {
      throw { statusCode: 400, message: 'Grace period cannot be negative.', code: 'INVALID_GRACE_PERIOD' };
    }

    const previous = await attendanceRepository.getActivePolicy();
    const updated = await attendanceRepository.updatePolicy(data);

    if (user && user.id) {
      await auditService.log({
        userId: user.id,
        action: 'ATTENDANCE_POLICY_UPDATED',
        entityName: 'AttendancePolicy',
        entityId: String(updated.id),
        previousValue: JSON.stringify(previous),
        newValue: JSON.stringify(updated),
      });
    }

    return updated;
  }
}

module.exports = new AttendanceService();
