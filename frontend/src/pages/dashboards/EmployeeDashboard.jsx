import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  DollarSign, Clock, Plane, FileText, Download, CheckCircle2, 
  AlertCircle, RefreshCw, Calendar, ArrowRight, UserCheck, 
  CreditCard, ShieldCheck, ChevronRight, X, Play, Square, Eye
} from 'lucide-react';
import api from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { formatDateDMY, formatPeriodRange } from '../../utils/formatters';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [employee, setEmployee] = useState(null);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [pastPayslips, setPastPayslips] = useState([]);
  const [attStatus, setAttStatus] = useState({ 
    checkedIn: false, 
    elapsedHours: 0, 
    workedHours: 0,
    hasCheckedInToday: false,
    hasCheckedOutToday: false,
    loading: false,
    checkInTime: null,
    checkOutTime: null,
  });
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingPdf, setDownloadingPdf] = useState(null);

  // Live seconds ticker for active shift
  const [currentTime, setCurrentTime] = useState(Date.now());

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

  // All Historical Payslips Modal
  const [showAllPayslipsModal, setShowAllPayslipsModal] = useState(false);

  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchEmployeePortalData();
  }, [user]);

  // Live timer tick every 1000ms when checked in
  useEffect(() => {
    let timer = null;
    if (attStatus.checkedIn) {
      timer = setInterval(() => {
        setCurrentTime(Date.now());
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [attStatus.checkedIn]);

  // Fast single-roundtrip portal fetch
  async function fetchEmployeePortalData() {
    setLoading(true);
    try {
      const res = await api.get('/dashboard/employee-portal');
      const d = res.data;
      if (d) {
        setEmployee(d.employee);
        setAttendanceLogs(d.attendanceLogs || []);
        setAllocations(d.allocations || []);
        setPastPayslips(d.pastPayslips || []);
        setLeaveTypes(d.leaveTypes || []);
        setPendingRequests(d.pendingRequests || []);

        if (d.attStatus) {
          setAttStatus({
            checkedIn: d.attStatus.checkedIn,
            elapsedHours: d.attStatus.elapsedHours || 0,
            workedHours: d.attStatus.workedHours || d.attStatus.elapsedHours || 0,
            hasCheckedInToday: d.attStatus.hasCheckedInToday ?? Boolean(d.attStatus.checkInTime),
            hasCheckedOutToday: d.attStatus.hasCheckedOutToday ?? Boolean(d.attStatus.checkOutTime),
            loading: false,
            checkInTime: d.attStatus.checkInTime,
            checkOutTime: d.attStatus.checkOutTime,
          });
        }

        if (d.leaveTypes?.length > 0 && !leaveForm.timeOffTypeId) {
          setLeaveForm(prev => ({ ...prev, timeOffTypeId: d.leaveTypes[0].id }));
        }
      }
    } catch (err) {
      console.error('Failed to load employee portal data:', err);
    } finally {
      setLoading(false);
    }
  }

  // Live sync with Navbar and Attendance page
  useEffect(() => {
    const handleSync = (e) => {
      if (e.detail?.checkedIn !== undefined) {
        setAttStatus(prev => ({ ...prev, checkedIn: e.detail.checkedIn }));
      }
      fetchEmployeePortalData();
    };
    window.addEventListener('attendance-status-changed', handleSync);
    window.addEventListener('attendance-updated', handleSync);
    return () => {
      window.removeEventListener('attendance-status-changed', handleSync);
      window.removeEventListener('attendance-updated', handleSync);
    };
  }, []);

  async function handleAttendanceAction(action) {
    const nextCheckedIn = action === 'CHECK_IN';
    setAttStatus(prev => ({ ...prev, checkedIn: nextCheckedIn, loading: true }));
    window.dispatchEvent(new CustomEvent('attendance-status-changed', {
      detail: { checkedIn: nextCheckedIn, action }
    }));

    try {
      const res = await api.post('/attendance/quick-toggle', { action });
      await fetchEmployeePortalData();
      window.dispatchEvent(new CustomEvent('attendance-status-changed', {
        detail: { checkedIn: res.data?.checkedIn ?? nextCheckedIn, record: res.data }
      }));
      
      setToast({
        type: 'success',
        message: action === 'CHECK_IN'
          ? 'Checked in successfully! Shift timer active.' 
          : 'Checked out of office! Total worked hours computed and saved.',
      });
      setTimeout(() => setToast(null), 4000);
    } catch (err) {
      setToast({ type: 'error', message: err.message || `Failed to ${action === 'CHECK_IN' ? 'check in' : 'check out'}.` });
      await fetchEmployeePortalData();
    } finally {
      setAttStatus(prev => ({ ...prev, loading: false }));
    }
  }

  async function handleDownloadPayslip(slipId, number) {
    setDownloadingPdf(slipId);
    try {
      const res = await api.get(`/payslips/${slipId}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data || res], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${number || 'Payslip'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
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

      // Fast reload
      await fetchEmployeePortalData();
    } catch (err) {
      alert(err.message || 'Failed to submit time off request.');
    } finally {
      setSubmittingLeave(false);
    }
  }

  // Active Contract
  const activeContract = employee?.contracts?.find(c => c.status === 'ACTIVE') || employee?.contracts?.[0];

  // Top 3 genuine past payslips
  const top3Payslips = pastPayslips.slice(0, 3);

  // Live Timer Computations
  let liveHoursStr = '0.0 hrs';
  let digitalClockStr = '00:00:00';
  if (attStatus.checkedIn && attStatus.checkInTime) {
    const elapsedMs = Math.max(0, currentTime - new Date(attStatus.checkInTime).getTime());
    const totalSecs = Math.floor(elapsedMs / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    digitalClockStr = `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    liveHoursStr = `${(elapsedMs / 3600000).toFixed(2)} hrs`;
  } else if (attStatus.hasCheckedOutToday || attStatus.workedHours > 0) {
    liveHoursStr = `${Number(attStatus.workedHours || attStatus.elapsedHours || 0).toFixed(2)} hrs`;
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-16">
      {/* Toast Notification */}
      {toast && (
        <div className={`py-2.5 px-4 text-xs font-medium border-b sticky top-14 z-20 flex items-center justify-between ${
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
            <button
              onClick={fetchEmployeePortalData}
              title="Refresh Dashboard"
              className="p-1.5 rounded text-slate-500 hover:text-[#714B67] hover:bg-slate-100 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
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
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex items-center justify-between">
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
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#00A09D]" />
                  <span>Work Shift Clock</span>
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  attStatus.checkedIn
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse'
                    : (attStatus.hasCheckedOutToday || attStatus.workedHours > 0)
                    ? 'bg-teal-50 text-[#00A09D] border-[#00A09D]/30'
                    : 'bg-slate-100 text-slate-600 border-slate-300'
                }`}>
                  {attStatus.checkedIn 
                    ? '● Shift In Progress' 
                    : (attStatus.hasCheckedOutToday || attStatus.workedHours > 0)
                    ? 'Shift Completed'
                    : 'Out of Office'}
                </span>
              </div>

              <div className="my-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono text-[#2C3E50]">
                    {attStatus.checkedIn ? digitalClockStr : liveHoursStr}
                  </span>
                  {attStatus.checkedIn && (
                    <span className="text-xs text-slate-500 font-mono">({liveHoursStr})</span>
                  )}
                </div>
                
                <div className="text-xs text-slate-500 mt-1">
                  {attStatus.checkedIn ? (
                    <span className="text-[#00A09D] font-medium">
                      Started at {attStatus.checkInTime ? new Date(attStatus.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}
                    </span>
                  ) : (attStatus.hasCheckedOutToday || attStatus.workedHours > 0) ? (
                    <span>
                      Checked in: <b>{attStatus.checkInTime ? new Date(attStatus.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</b>
                      {' '}• Checked out: <b>{attStatus.checkOutTime ? new Date(attStatus.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</b>
                    </span>
                  ) : (
                    'Standard 40h workweek (9:00 AM - 6:00 PM)'
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 mt-3 grid grid-cols-2 gap-2">
              {/* Option 1: Check In */}
              <button
                type="button"
                onClick={() => handleAttendanceAction('CHECK_IN')}
                disabled={attStatus.loading || attStatus.checkedIn}
                className={`py-2.5 px-3 text-xs font-semibold rounded shadow-xs transition-all flex items-center justify-center gap-1.5 ${
                  attStatus.checkedIn
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default opacity-90'
                    : 'bg-[#00A09D] hover:bg-[#008b88] text-white cursor-pointer active:scale-98'
                }`}
              >
                {attStatus.loading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : attStatus.checkedIn ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                ) : (
                  <Play className="w-3 h-3 fill-current" />
                )}
                <span>{attStatus.checkedIn ? 'Checked In' : 'Check In'}</span>
              </button>

              {/* Option 2: Check Out */}
              <button
                type="button"
                onClick={() => handleAttendanceAction('CHECK_OUT')}
                disabled={attStatus.loading || !attStatus.checkedIn}
                className={`py-2.5 px-3 text-xs font-semibold rounded shadow-xs transition-all flex items-center justify-center gap-1.5 ${
                  !attStatus.checkedIn
                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-default'
                    : 'bg-[#714B67] hover:bg-[#5a3b52] text-white cursor-pointer active:scale-98'
                }`}
              >
                {attStatus.loading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : !attStatus.checkedIn ? (
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                ) : (
                  <Square className="w-3 h-3 fill-current" />
                )}
                <span>{attStatus.checkedIn ? 'Check Out' : 'Out of Office'}</span>
              </button>
            </div>
          </div>

          {/* CARD 2: Current Contract & Wage Overview */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
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
                Structure: <span className="font-medium text-slate-700">{activeContract?.salaryStructure?.name || 'Regular Salary Structure'}</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono text-[11px]">
                CON/2026/{String(activeContract?.id || employee?.id || 1).padStart(4, '0')}
              </span>
              <Link to="/my-profile" className="text-[#714B67] hover:underline font-semibold text-xs flex items-center gap-0.5">
                Salary Breakdown <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* CARD 3: Time Off & Leave Balances */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
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

            <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between text-xs">
              <span className="text-slate-500">2026 Calendar Year</span>
              <Link to="/time-off" className="text-[#714B67] hover:underline font-semibold flex items-center gap-0.5">
                View All Leaves <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

        </div>

        {/* Middle Section: Last 3 Past Payslips + Attendance Recent Records */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* PAST PAYSLIPS STATEMENT CARD (LAST 3 GENUINE PAST PAYSLIPS + VIEW MORE) */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#714B67]" />
                <div>
                  <h3 className="font-bold text-sm text-[#2C3E50]">Past Payslip Statements</h3>
                  <p className="text-[11px] text-slate-500">Last 3 Disbursed Salary Cycles (Completed Months)</p>
                </div>
              </div>
              
              {pastPayslips.length > 0 && (
                <button
                  onClick={() => setShowAllPayslipsModal(true)}
                  className="text-xs font-semibold text-[#714B67] hover:underline flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View More ({pastPayslips.length})</span>
                </button>
              )}
            </div>

            {top3Payslips.length > 0 ? (
              <div className="space-y-3 text-xs">
                {top3Payslips.map((slip) => (
                  <div 
                    key={slip.id} 
                    className="p-3.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors bg-slate-50/50 flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[11px] font-semibold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {slip.payslipNumber}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                          {slip.status}
                        </span>
                      </div>

                      <div className="font-bold text-slate-800 text-xs">
                        {slip.payrun?.name || 'Monthly Payroll Cycle'}
                      </div>

                      <div className="text-[11px] text-slate-500">
                        Period: <span className="font-mono font-medium text-slate-700">{formatPeriodRange(slip.payrun?.periodStart, slip.payrun?.periodEnd)}</span>
                        {' '}• Gross: <span className="font-mono text-slate-700">₹{slip.grossSalary?.toLocaleString()}</span>
                        {' '}• Deductions: <span className="font-mono text-rose-600">-₹{slip.totalDeductions?.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1.5">
                      <div className="text-[10px] uppercase text-slate-400 font-semibold">Net Disbursed</div>
                      <div className="text-base font-extrabold font-mono text-teal-700">
                        ₹{slip.netSalary?.toLocaleString()}
                      </div>

                      <button
                        onClick={() => handleDownloadPayslip(slip.id, slip.payslipNumber)}
                        disabled={downloadingPdf === slip.id}
                        className="btn-outline text-[11px] py-1 px-2.5 flex items-center gap-1.5"
                        title="Download PDF"
                      >
                        {downloadingPdf === slip.id ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Download className="w-3 h-3" />
                        )}
                        <span>PDF</span>
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  onClick={() => setShowAllPayslipsModal(true)}
                  className="w-full mt-2 py-2 rounded border border-dashed border-slate-300 text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>View All Past Payslips Archive ({pastPayslips.length})</span>
                </button>
              </div>
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
                No past payslips on file yet.
              </div>
            )}
          </div>

          {/* Recent Attendance Logs */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#00A09D]" />
                <div>
                  <h3 className="font-bold text-sm text-[#2C3E50]">Recent Attendance Activity</h3>
                  <p className="text-[11px] text-slate-500">Logs from latest biometric & web check-ins</p>
                </div>
              </div>
              <Link to="/attendance" className="text-xs text-[#714B67] hover:underline font-semibold flex items-center gap-0.5">
                <span>Full Log</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {attendanceLogs.length > 0 ? (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="px-3 py-2.5">Date (DD/MM/YYYY)</th>
                      <th className="px-3 py-2.5">Check In</th>
                      <th className="px-3 py-2.5">Check Out</th>
                      <th className="px-3 py-2.5">Worked Hours</th>
                      <th className="px-3 py-2.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {attendanceLogs.map((att) => (
                      <tr key={att.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5 font-medium font-mono">{formatDateDMY(att.date)}</td>
                        <td className="px-3 py-2.5 font-mono text-slate-600">{att.checkIn ? new Date(att.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                        <td className="px-3 py-2.5 font-mono text-slate-600">{att.checkOut ? new Date(att.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                        <td className="px-3 py-2.5 font-mono font-bold text-teal-700">
                          {att.workedHours !== undefined ? `${att.workedHours}h` : '-'}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                            att.status === 'PRESENT'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : att.status === 'LATE'
                              ? 'bg-purple-50 text-[#714B67] border-[#714B67]/30'
                              : att.status === 'OVERTIME'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
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
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
                No attendance entries logged yet.
              </div>
            )}
          </div>

        </div>

      </div>

      {/* MODAL: ALL HISTORICAL PAST PAYSLIPS */}
      {showAllPayslipsModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xl max-w-4xl w-full overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#714B67]" />
                <div>
                  <h3 className="font-bold text-sm text-[#2C3E50]">All Historical Payslips Archive</h3>
                  <p className="text-[11px] text-slate-500">Access and download all past month salary statements (DD/MM/YYYY)</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAllPayslipsModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="px-3 py-2.5">Payslip Number</th>
                    <th className="px-3 py-2.5">Payrun / Period (DD/MM/YYYY)</th>
                    <th className="px-3 py-2.5">Gross</th>
                    <th className="px-3 py-2.5">Deductions</th>
                    <th className="px-3 py-2.5">Net Disbursed</th>
                    <th className="px-3 py-2.5">Status</th>
                    <th className="px-3 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {pastPayslips.map((slip) => (
                    <tr key={slip.id} className="hover:bg-slate-50">
                      <td className="px-3 py-3 font-mono font-semibold text-slate-900">{slip.payslipNumber}</td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-slate-800">{slip.payrun?.name || 'Payroll Cycle'}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {formatPeriodRange(slip.payrun?.periodStart, slip.payrun?.periodEnd)}
                        </div>
                      </td>
                      <td className="px-3 py-3 font-mono">₹{slip.grossSalary?.toLocaleString()}</td>
                      <td className="px-3 py-3 font-mono text-rose-600">-₹{slip.totalDeductions?.toLocaleString()}</td>
                      <td className="px-3 py-3 font-mono font-bold text-teal-700">₹{slip.netSalary?.toLocaleString()}</td>
                      <td className="px-3 py-3">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200">
                          {slip.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        <button
                          onClick={() => handleDownloadPayslip(slip.id, slip.payslipNumber)}
                          disabled={downloadingPdf === slip.id}
                          className="btn-primary text-xs py-1 px-3 inline-flex items-center gap-1.5 shadow-xs"
                        >
                          {downloadingPdf === slip.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : (
                            <Download className="w-3 h-3" />
                          )}
                          <span>Download PDF</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setShowAllPayslipsModal(false)}
                className="btn-outline text-xs px-4 py-1.5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: QUICK LEAVE REQUEST */}
      {leaveModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Plane className="w-4 h-4 text-[#714B67]" />
                <h3 className="font-bold text-sm text-[#2C3E50]">Submit Time Off Request</h3>
              </div>
              <button onClick={() => setLeaveModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLeaveSubmit} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Time Off Type *</label>
                <select
                  required
                  value={leaveForm.timeOffTypeId}
                  onChange={(e) => setLeaveForm({ ...leaveForm, timeOffTypeId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs"
                >
                  {leaveTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Duration (Days) *</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="30"
                  required
                  value={leaveForm.durationDays}
                  onChange={(e) => setLeaveForm({ ...leaveForm, durationDays: parseFloat(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Reason / Note</label>
                <textarea
                  rows={2}
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  placeholder="e.g., Annual family vacation or medical recovery"
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
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
                  {submittingLeave ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
