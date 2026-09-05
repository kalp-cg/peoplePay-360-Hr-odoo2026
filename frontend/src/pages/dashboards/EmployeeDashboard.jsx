import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  DollarSign, Clock, Plane, FileText, Download, CheckCircle2, 
  AlertCircle, RefreshCw, Calendar, ArrowRight, UserCheck, 
  CreditCard, ShieldCheck, ChevronRight, X
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [employee, setEmployee] = useState(null);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [payslips, setPayslips] = useState([]);
  const [attStatus, setAttStatus] = useState({ checkedIn: false, elapsedHours: 0, loading: false });
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(null);

  // Quick Leave Request Modal
  const [leaveModal, setLeaveModal] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveForm, setLeaveForm] = useState({
    timeOffTypeId: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    durationDays: 1,
    reason: '',
  });
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchEmployeePortalData();
    const interval = setInterval(fetchAttendanceStatus, 30000);
    return () => clearInterval(interval);
  }, [user]);

  async function fetchAttendanceStatus() {
    try {
      const res = await api.get('/attendance/current-status');
      if (res.data) {
        setAttStatus({
          checkedIn: res.data.checkedIn,
          elapsedHours: res.data.elapsedHours || 0,
          loading: false,
          checkInTime: res.data.checkInTime,
          checkOutTime: res.data.checkOutTime,
        });
      }
    } catch (err) {
      console.warn('[Attendance status]:', err);
    }
  }

  async function fetchEmployeePortalData() {
    setLoading(true);
    try {
      const [empRes, attRes, allocRes, slipRes, typesRes, reqsRes] = await Promise.all([
        api.get('/employees'),
        api.get('/attendance'),
        api.get('/time-off/allocations'),
        api.get('/payslips'),
        api.get('/time-off/types'),
        api.get('/employees/profile-change-requests').catch(() => ({ data: [] })),
      ]);

      const self = empRes.data.find(e => e.id === user?.employeeId) || empRes.data[0];
      if (self) {
        const fullDetail = await api.get(`/employees/${self.id}`);
        setEmployee(fullDetail.data);
      }
      setAttendanceLogs(attRes.data.slice(0, 5));
      setAllocations(allocRes.data);
      setPayslips(slipRes.data);
      setLeaveTypes(typesRes.data);
      setPendingRequests(reqsRes.data.filter(r => r.status === 'PENDING'));

      if (typesRes.data.length > 0) {
        setLeaveForm(prev => ({ ...prev, timeOffTypeId: typesRes.data[0].id }));
      }

      await fetchAttendanceStatus();
    } catch (err) {
      console.error('Failed to load employee portal data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleAttendance() {
    setAttStatus(prev => ({ ...prev, loading: true }));
    try {
      await api.post('/attendance/quick-toggle');
      await fetchAttendanceStatus();
      const updatedAtt = await api.get('/attendance');
      setAttendanceLogs(updatedAtt.data.slice(0, 5));
      setToast({
        type: 'success',
        message: !attStatus.checkedIn ? 'Checked in successfully! Shift timer active.' : 'Checked out successfully! Have a great evening.'
      });
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to toggle attendance.' });
    } finally {
      setAttStatus(prev => ({ ...prev, loading: false }));
    }
  }

  async function handleDownloadPayslip(slipId) {
    setDownloadingPdf(slipId);
    try {
      const res = await api.get(`/payslips/${slipId}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data || res], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      alert(err.message || 'Failed to download payslip.');
    } finally {
      setDownloadingPdf(null);
    }
  }

  async function handleLeaveSubmit(e) {
    e.preventDefault();
    setSubmittingLeave(true);
    try {
      await api.post('/time-off/requests', leaveForm);
      setLeaveModal(false);
      setToast({ type: 'success', message: 'Time off request submitted to HR Manager for review.' });
      setTimeout(() => setToast(null), 4500);

      const [updatedAlloc, updatedReqs] = await Promise.all([
        api.get('/time-off/allocations'),
        api.get('/time-off/requests'),
      ]);
      setAllocations(updatedAlloc.data);
    } catch (err) {
      alert(err.message || 'Failed to submit time off request.');
    } finally {
      setSubmittingLeave(false);
    }
  }

  const activeContract = employee?.contracts?.find(c => c.status === 'ACTIVE') || employee?.contracts?.[0];
  const latestPayslip = payslips[0];

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-16">
      {/* Toast Notification */}
      {toast && (
        <div className={`py-2 px-4 text-xs font-medium border-b sticky top-14 z-20 flex items-center justify-between ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <div className="max-w-7xl mx-auto flex items-center gap-2 w-full">
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-auto text-slate-400 hover:text-slate-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Control Panel / Breadcrumb */}
      <div className="bg-white border-b border-slate-200 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-0.5">
              <span>Employee Portal</span>
              <span>/</span>
              <span className="text-[#714B67] font-semibold">Self Service Dashboard</span>
            </div>
            <h1 className="text-xl font-bold text-[#2C3E50]">Welcome back, {employee?.name || user?.name}!</h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 hidden sm:inline">
              ID: <b className="text-slate-700 font-mono">{employee?.employeeId || user?.email}</b>
            </span>
            <Link
              to="/my-profile"
              className="btn-outline text-xs flex items-center gap-1.5"
            >
              <span>View Full Profile</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">

        {/* Pending Profile Change Request Alert */}
        {pendingRequests.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>You have a pending <b>Profile Change Request</b> submitted for HR Manager review.</span>
            </div>
            <Link to="/my-profile" className="font-semibold underline text-amber-800 hover:text-amber-950">
              View Status
            </Link>
          </div>
        )}

        {/* Top 3 Core Action Cards: Clock In/Out, Current Wage, Time Off */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* CARD 1: Real-time Attendance Check-in Widget */}
          <div className="bg-white border border-slate-200 rounded p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#00A09D]" />
                  <span>Work Shift Clock</span>
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  attStatus.checkedIn
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse'
                    : 'bg-slate-100 text-slate-600 border-slate-300'
                }`}>
                  {attStatus.checkedIn ? '● Checked In' : 'Out of Office'}
                </span>
              </div>

              <div className="my-2">
                <div className="text-2xl font-bold font-mono text-[#2C3E50]">
                  {attStatus.checkedIn ? `${attStatus.elapsedHours} hrs` : '0.0 hrs'}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {attStatus.checkedIn 
                    ? `Checked in at ${attStatus.checkInTime ? new Date(attStatus.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}`
                    : 'Standard 40h workweek (9:00 AM - 6:00 PM)'}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 mt-2">
              <button
                type="button"
                onClick={handleToggleAttendance}
                disabled={attStatus.loading}
                className={`w-full py-2 px-3 text-xs font-semibold rounded shadow-xs transition-colors flex items-center justify-center gap-2 ${
                  attStatus.checkedIn
                    ? 'bg-rose-600 hover:bg-rose-700 text-white'
                    : 'bg-[#00A09D] hover:bg-[#008b88] text-white'
                }`}
              >
                {attStatus.loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
                <span>{attStatus.checkedIn ? 'Check Out of Office' : 'Check In Now'}</span>
              </button>
            </div>
          </div>

          {/* CARD 2: Current Contract & Wage Overview */}
          <div className="bg-white border border-slate-200 rounded p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-[#714B67]" />
                  <span>Compensation & Contract</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {activeContract?.status === 'ACTIVE' ? 'Active' : 'Running'}
                </span>
              </div>

              <div className="my-2">
                <div className="text-2xl font-bold font-mono text-teal-700">
                  ₹{(activeContract?.wage || 0).toLocaleString()} <span className="text-xs text-slate-500 font-normal">/ month</span>
                </div>
                <div className="text-xs text-slate-600 mt-0.5">
                  Annual CTC: <b className="font-mono text-slate-800">₹{((activeContract?.wage || 0) * 12).toLocaleString()}</b>
                </div>
              </div>

              <div className="text-xs text-slate-500 mt-1 truncate">
                Structure: <span className="font-medium text-slate-700">{activeContract?.salaryStructure?.name || 'Standard Structure'}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 mt-2 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono text-[11px]">
                CON/2026/{String(activeContract?.id || employee?.id || 1).padStart(4, '0')}
              </span>
              <Link to="/my-profile" className="text-[#714B67] hover:underline font-semibold text-xs flex items-center gap-0.5">
                Salary Breakdown <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* CARD 3: Time Off & Leave Balances */}
          <div className="bg-white border border-slate-200 rounded p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Plane className="w-4 h-4 text-amber-600" />
                  <span>Time Off Balances</span>
                </span>
                <button
                  onClick={() => setLeaveModal(true)}
                  className="text-xs font-semibold text-[#714B67] hover:underline"
                >
                  + Request Leave
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 my-1">
                {allocations.slice(0, 2).map((a) => (
                  <div key={a.id} className="bg-slate-50 border border-slate-200 rounded p-2.5">
                    <div className="text-[11px] text-slate-500 font-medium truncate">{a.timeOffType?.name}</div>
                    <div className="text-lg font-bold font-mono text-[#714B67] mt-0.5">
                      {a.remainingDays} <span className="text-[10px] text-slate-400 font-normal">days left</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 mt-2 flex items-center justify-between text-xs">
              <span className="text-slate-500">2026 Calendar Year</span>
              <Link to="/time-off" className="text-[#714B67] hover:underline font-semibold flex items-center gap-0.5">
                View All Leaves <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

        </div>

        {/* Middle Section: Latest Payslip Download + Attendance Recent Records */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Latest Payslip Quick Card */}
          <div className="bg-white border border-slate-200 rounded shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#714B67]" />
                <h3 className="font-bold text-sm text-[#2C3E50]">Latest Payslip Statement</h3>
              </div>
              {latestPayslip && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-50 text-[#00A09D] font-bold border border-[#00A09D]/30">
                  {latestPayslip.status}
                </span>
              )}
            </div>

            {latestPayslip ? (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded border border-slate-200">
                  <div>
                    <div className="text-[11px] text-slate-500 font-mono">{latestPayslip.payslipNumber}</div>
                    <div className="font-bold text-slate-800 text-sm mt-0.5">
                      {latestPayslip.payrun?.name || 'Monthly Payroll'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase text-slate-400 font-semibold">Net Disbursed</div>
                    <div className="text-xl font-bold font-mono text-teal-700">
                      ₹{latestPayslip.netSalary?.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 rounded bg-slate-50 border border-slate-100">
                    <div className="text-[10px] text-slate-500">Gross Salary</div>
                    <div className="font-mono font-bold text-slate-800 mt-0.5">
                      ₹{latestPayslip.grossSalary?.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-100">
                    <div className="text-[10px] text-slate-500">Deductions</div>
                    <div className="font-mono font-bold text-rose-600 mt-0.5">
                      - ₹{latestPayslip.totalDeductions?.toLocaleString()}
                    </div>
                  </div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-100">
                    <div className="text-[10px] text-slate-500">Attendance</div>
                    <div className="font-mono font-bold text-slate-800 mt-0.5">
                      {latestPayslip.presentDays} / {latestPayslip.workingDays} d
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleDownloadPayslip(latestPayslip.id)}
                  disabled={downloadingPdf === latestPayslip.id}
                  className="w-full btn-primary text-xs py-2 flex items-center justify-center gap-2"
                >
                  {downloadingPdf === latestPayslip.id ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>Download Official Payslip (PDF)</span>
                </button>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded">
                No payslip generated yet for this period.
              </div>
            )}
          </div>

          {/* Recent Attendance Logs */}
          <div className="bg-white border border-slate-200 rounded shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#00A09D]" />
                <h3 className="font-bold text-sm text-[#2C3E50]">Recent Attendance Activity</h3>
              </div>
              <Link to="/attendance" className="text-xs text-[#714B67] hover:underline font-semibold">
                Full Log
              </Link>
            </div>

            {attendanceLogs.length > 0 ? (
              <div className="border border-slate-200 rounded overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Check In</th>
                      <th className="px-3 py-2">Check Out</th>
                      <th className="px-3 py-2">Hours</th>
                      <th className="px-3 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {attendanceLogs.map((att) => (
                      <tr key={att.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium">{new Date(att.date).toLocaleDateString()}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{att.checkIn ? new Date(att.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                        <td className="px-3 py-2 font-mono text-slate-600">{att.checkOut ? new Date(att.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                        <td className="px-3 py-2 font-mono font-semibold">{att.workedHours ? `${att.workedHours}h` : '-'}</td>
                        <td className="px-3 py-2">
                          <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded-full border ${
                            att.status === 'PRESENT'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : att.status === 'LATE'
                              ? 'bg-purple-50 text-[#714B67] border-[#714B67]/30'
                              : 'bg-slate-100 text-slate-600 border-slate-300'
                          }`}>
                            {att.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded">
                No attendance logs found for this week.
              </div>
            )}
          </div>

        </div>

      </div>

      {/* QUICK LEAVE REQUEST MODAL */}
      {leaveModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xl max-w-md w-full">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-sm text-[#2C3E50]">Submit Time Off Request</h3>
              <button onClick={() => setLeaveModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLeaveSubmit} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Time Off Type *</label>
                <select
                  required
                  value={leaveForm.timeOffTypeId}
                  onChange={(e) => setLeaveForm({ ...leaveForm, timeOffTypeId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                >
                  {leaveTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Duration (Days)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={leaveForm.durationDays}
                  onChange={(e) => setLeaveForm({ ...leaveForm, durationDays: parseFloat(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Reason / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Reason for absence"
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setLeaveModal(false)}
                  className="btn-outline text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingLeave}
                  className="btn-primary text-xs"
                >
                  {submittingLeave ? 'Submitting...' : 'Submit to HR'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
