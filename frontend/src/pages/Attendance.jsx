import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Clock, Plus, Edit2, CheckCircle2, AlertTriangle, X, ShieldAlert, 
  Calendar, Check, RefreshCw, AlertCircle, Copy, Sliders, ShieldCheck
} from 'lucide-react';
import api from '../api/client';
import ControlPanel from '../components/ControlPanel';
import { useAuth } from '../context/AuthContext';
import { formatDateDMY } from '../utils/formatters';

export default function Attendance() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const employeeIdParam = searchParams.get('employeeId');

  const isEmployee = user?.role === 'EMPLOYEE';
  const canCorrect = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'].includes(user?.role);
  const canManagePolicy = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'].includes(user?.role);

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Employee Quick Toggle State
  const [attStatus, setAttStatus] = useState({ checkedIn: false, elapsedHours: 0, loading: false });
  const [errorInfo, setErrorInfo] = useState(null);
  const [copied, setCopied] = useState(false);

  // Attendance Policy Management State (Admin / HR)
  const [policyModal, setPolicyModal] = useState(false);
  const [policy, setPolicy] = useState(null);
  const [policyForm, setPolicyForm] = useState({
    name: 'Standard Enterprise Policy',
    fullDayHours: 7.0,
    halfDayHours: 4.0,
    gracePeriodMins: 15,
    overtimeThreshold: 9.0,
    breakDeductionHours: 1.0,
    maxShiftHoursCap: 14.0,
  });
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [policyToast, setPolicyToast] = useState(null);

  // Correction Modal State
  const [correctionModal, setCorrectionModal] = useState(false);
  const [editForm, setEditForm] = useState({
    checkIn: '',
    checkOut: '',
    breakHours: 1.0,
    correctionReason: '',
  });

  useEffect(() => {
    fetchAttendance();
    fetchPolicy();
    if (isEmployee) {
      fetchCurrentStatus();
    }

    const handleAttUpdate = (e) => {
      if (e?.detail?.checkedIn !== undefined) {
        setAttStatus(prev => ({ ...prev, checkedIn: e.detail.checkedIn }));
      }
      fetchAttendance();
      if (isEmployee) fetchCurrentStatus();
    };
    window.addEventListener('attendance-updated', handleAttUpdate);
    window.addEventListener('attendance-status-changed', handleAttUpdate);
    return () => {
      window.removeEventListener('attendance-updated', handleAttUpdate);
      window.removeEventListener('attendance-status-changed', handleAttUpdate);
    };
  }, [statusFilter, isEmployee, employeeIdParam]);

  async function fetchPolicy() {
    try {
      const res = await api.get('/attendance/policy');
      if (res.data) {
        setPolicy(res.data);
        setPolicyForm({
          name: res.data.name || 'Standard Enterprise Policy',
          fullDayHours: res.data.fullDayHours ?? 7.0,
          halfDayHours: res.data.halfDayHours ?? 4.0,
          gracePeriodMins: res.data.gracePeriodMins ?? 15,
          overtimeThreshold: res.data.overtimeThreshold ?? 9.0,
          breakDeductionHours: res.data.breakDeductionHours ?? 1.0,
          maxShiftHoursCap: res.data.maxShiftHoursCap ?? 14.0,
        });
      }
    } catch (err) {
      console.warn('[Fetch Attendance Policy]:', err);
    }
  }

  async function handleSavePolicy(e) {
    e.preventDefault();
    setSavingPolicy(true);
    try {
      const res = await api.put('/attendance/policy', policyForm);
      setPolicy(res.data);
      setPolicyToast('✓ Attendance thresholds updated dynamically! All calculations now apply immediately.');
      setTimeout(() => setPolicyToast(null), 4000);
      setPolicyModal(false);
      fetchAttendance();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to update attendance policy');
    } finally {
      setSavingPolicy(false);
    }
  }

  async function fetchAttendance() {
    setLoading(true);
    try {
      const params = {
        status: statusFilter || undefined,
        employeeId: employeeIdParam || undefined,
      };
      const res = await api.get('/attendance', { params });
      setRecords(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCurrentStatus() {
    try {
      const res = await api.get('/attendance/current-status');
      if (res.data) {
        setAttStatus({
          checkedIn: res.data.checkedIn,
          elapsedHours: res.data.elapsedHours || 0,
          workedHours: res.data.workedHours || res.data.elapsedHours || 0,
          hasCheckedInToday: res.data.hasCheckedInToday ?? Boolean(res.data.checkInTime),
          hasCheckedOutToday: res.data.hasCheckedOutToday ?? Boolean(res.data.checkOutTime),
          loading: false,
        });
      }
    } catch (err) {
      console.warn('Failed to fetch attendance status:', err);
    }
  }

  async function handleAttendanceAction(action) {
    const nextCheckedIn = action === 'CHECK_IN';
    setAttStatus((prev) => ({ ...prev, checkedIn: nextCheckedIn, loading: true }));
    window.dispatchEvent(new CustomEvent('attendance-status-changed', {
      detail: { checkedIn: nextCheckedIn, action }
    }));
    try {
      const res = await api.post('/attendance/quick-toggle', { action });
      window.dispatchEvent(new CustomEvent('attendance-status-changed', {
        detail: { checkedIn: res.data?.checkedIn ?? nextCheckedIn, record: res.data }
      }));
      await Promise.all([fetchCurrentStatus(), fetchAttendance()]);
    } catch (err) {
      console.error('[Attendance Toggle Error]:', err);
      alert(err.message || `Failed to ${action === 'CHECK_IN' ? 'check in' : 'check out'}.`);
      await Promise.all([fetchCurrentStatus(), fetchAttendance()]);
    } finally {
      setAttStatus((prev) => ({ ...prev, loading: false }));
    }
  }

  function handleOpenCorrection(rec) {
    setSelectedRecord(rec);
    setEditForm({
      checkIn: rec.checkIn ? new Date(rec.checkIn).toISOString().slice(11, 16) : '09:00',
      checkOut: rec.checkOut ? new Date(rec.checkOut).toISOString().slice(11, 16) : '18:00',
      breakHours: rec.breakHours || 1.0,
      correctionReason: '',
    });
    setCorrectionModal(true);
  }

  async function handleSaveCorrection(e) {
    e.preventDefault();
    if (!editForm.correctionReason.trim()) {
      alert('A correction reason is required for audit compliance.');
      return;
    }

    try {
      const baseDate = new Date(selectedRecord.date).toISOString().slice(0, 10);
      const fullCheckIn = `${baseDate}T${editForm.checkIn}:00Z`;
      const fullCheckOut = `${baseDate}T${editForm.checkOut}:00Z`;

      await api.put(`/attendance/${selectedRecord.id}`, {
        checkIn: fullCheckIn,
        checkOut: fullCheckOut,
        breakHours: parseFloat(editForm.breakHours),
        correctionReason: editForm.correctionReason,
      });

      setCorrectionModal(false);
      fetchAttendance();
    } catch (err) {
      alert(err.message || 'Failed to correct attendance');
    }
  }

  const filtered = records.filter((r) => {
    const q = search.toLowerCase();
    return (
      r.employee?.name?.toLowerCase().includes(q) ||
      r.employee?.employeeId?.toLowerCase().includes(q) ||
      r.status?.toLowerCase().includes(q)
    );
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PRESENT':
        return 'bg-teal-50 text-[#00A09D] border-[#00A09D]/30';
      case 'HALF_DAY':
        return 'bg-amber-50 text-amber-700 border-amber-300 font-semibold';
      case 'LATE':
        return 'bg-purple-50 text-[#714B67] border-[#714B67]/30';
      case 'OVERTIME':
        return 'bg-slate-100 text-[#2C3E50] border-slate-300';
      case 'ABSENT':
        return 'bg-slate-100 text-slate-600 border-slate-300';
      case 'CORRECTED':
        return 'bg-purple-50/70 text-[#714B67] border-[#714B67]/20';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  // Employee aggregates
  const totalWorkedHours = filtered.reduce((sum, r) => sum + (Number(r.workedHours) || 0), 0);
  const presentDays = filtered.filter(r => r.status === 'PRESENT' || r.status === 'OVERTIME' || r.status === 'LATE' || r.status === 'HALF_DAY').length;
  const onTimeDays = filtered.filter(r => r.status === 'PRESENT' || r.status === 'OVERTIME' || r.status === 'HALF_DAY').length;
  const onTimePercent = presentDays > 0 ? Math.round((onTimeDays / presentDays) * 100) : 100;

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-12">
      <ControlPanel
        title={isEmployee ? 'My Attendance & Work Hours' : 'Workforce Attendance Records'}
        subtitle={isEmployee ? 'Punch Clock, Elapsed Time & Personal Monthly Time Logs' : 'Time Tracking, Worked Hours & Audit Corrections'}
        breadcrumbs={[{ label: 'Dashboard', path: '/' }, { label: 'Attendance' }]}
        searchQuery={isEmployee ? undefined : search}
        onSearchChange={isEmployee ? undefined : setSearch}
        actions={
          <div className="flex items-center gap-2">
            {canManagePolicy && (
              <button
                onClick={() => setPolicyModal(true)}
                className="btn-secondary text-xs flex items-center gap-1.5"
                title="Configure Full Day, Half Day, Grace Period & Overtime rules"
              >
                <Sliders className="w-3.5 h-3.5 text-[#714B67]" />
                <span>Attendance Policy &amp; Thresholds</span>
              </button>
            )}
            <button
              onClick={() => { fetchAttendance(); if (isEmployee) fetchCurrentStatus(); }}
              className="btn-outline text-xs flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* EMPLOYEE TOP PUNCH CLOCK & STATS BAR */}
        {isEmployee && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#714B67] text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  {(user?.name || 'EM').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#2C3E50]">{user?.name}</h2>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                    <span className="font-mono text-[#00A09D] font-semibold">
                      {attStatus.checkedIn 
                        ? '● Currently Checked In' 
                        : (attStatus.hasCheckedOutToday || attStatus.workedHours > 0)
                        ? `Shift Done (${attStatus.workedHours}h logged today)`
                        : '○ Currently Checked Out'}
                    </span>
                    {attStatus.checkedIn && (
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[11px] font-mono">
                        {attStatus.elapsedHours} hrs elapsed today
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Option 1: Check In */}
                <button
                  type="button"
                  onClick={() => handleAttendanceAction('CHECK_IN')}
                  disabled={attStatus.loading || attStatus.checkedIn}
                  className={`px-4 py-2.5 rounded text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 ${
                    attStatus.checkedIn
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default opacity-90'
                      : 'bg-[#00A09D] hover:bg-[#008b88] text-white cursor-pointer active:scale-98'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${attStatus.checkedIn ? 'bg-emerald-500 animate-pulse' : 'bg-teal-200'}`} />
                  <span>{attStatus.checkedIn ? 'Checked In' : 'Check In'}</span>
                </button>

                {/* Option 2: Check Out */}
                <button
                  type="button"
                  onClick={() => handleAttendanceAction('CHECK_OUT')}
                  disabled={attStatus.loading || !attStatus.checkedIn}
                  className={`px-4 py-2.5 rounded text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5 ${
                    !attStatus.checkedIn
                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-default'
                      : 'bg-[#714B67] hover:bg-[#5a3b52] text-white cursor-pointer active:scale-98'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${!attStatus.checkedIn ? 'bg-slate-300' : 'bg-rose-400 animate-pulse'}`} />
                  <span>{attStatus.checkedIn ? 'Check Out' : 'Out of Office'}</span>
                </button>
              </div>
            </div>

            {/* 3 Personal Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                <div className="text-xs text-slate-500 font-medium">Logged Month Hours</div>
                <div className="text-2xl font-extrabold text-[#00A09D] mt-1 font-mono">{totalWorkedHours.toFixed(1)} hrs</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Meal breaks auto-deducted</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                <div className="text-xs text-slate-500 font-medium">Days Present This Month</div>
                <div className="text-2xl font-extrabold text-[#2C3E50] mt-1 font-mono">{presentDays} Days</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Across recorded shifts</div>
              </div>
              <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                <div className="text-xs text-slate-500 font-medium">On-Time Arrival Rate</div>
                <div className="text-2xl font-extrabold text-[#714B67] mt-1 font-mono">{onTimePercent}%</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Schedule compliance</div>
              </div>
            </div>
          </div>
        )}

        {/* Table Card */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          {/* Integrated Filter Bar */}
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="font-semibold text-slate-500 mr-1 text-[11px] uppercase tracking-wider">Status:</span>
              {['', 'PRESENT', 'HALF_DAY', 'LATE', 'OVERTIME', 'ABSENT', 'CORRECTED'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    statusFilter === s 
                      ? 'bg-[#714B67] text-white font-semibold shadow-sm' 
                      : 'text-slate-600 hover:bg-slate-200/70'
                  }`}
                >
                  {s ? s : 'All Entries'}
                </button>
              ))}
            </div>
            <span className="text-xs text-slate-500 font-medium">
              Showing {filtered.length} entries
            </span>
          </div>

          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Date</th>
                {!isEmployee && <th className="px-4 py-3">Employee</th>}
                <th className="px-4 py-3">Check In</th>
                <th className="px-4 py-3">Check Out</th>
                <th className="px-4 py-3">Break</th>
                <th className="px-4 py-3">Worked Hours</th>
                <th className="px-4 py-3">Status</th>
                {canCorrect && <th className="px-4 py-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={canCorrect ? 8 : (isEmployee ? 6 : 7)} className="text-center py-8 text-slate-400">
                    No attendance records found.
                  </td>
                </tr>
              ) : (
                filtered.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 tabular-nums font-medium text-slate-900 font-mono">
                      {formatDateDMY(rec.date)}
                    </td>
                    {!isEmployee && (
                      <td className="px-4 py-3">
                        <span className="font-medium text-slate-900">{rec.employee?.name}</span>
                        <span className="ml-1 text-[11px] text-slate-400 font-mono">({rec.employee?.employeeId})</span>
                      </td>
                    )}
                    <td className="px-4 py-3 tabular-nums text-slate-700 font-mono">
                      {rec.checkIn ? new Date(rec.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-700 font-mono">
                      {rec.checkOut ? new Date(rec.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{rec.breakHours}h</td>
                    <td className="px-4 py-3 font-semibold text-teal-700 tabular-nums font-mono">
                      {rec.workedHours} hrs
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${getStatusBadge(rec.status)}`}>
                        {rec.status}
                      </span>
                      {rec.correctionReason && (
                        <span className="block text-[10px] text-slate-400 truncate max-w-[150px]" title={rec.correctionReason}>
                          "{rec.correctionReason}"
                        </span>
                      )}
                    </td>
                    {canCorrect && (
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleOpenCorrection(rec)}
                          className="text-slate-500 hover:text-[#714B67] hover:bg-slate-100 p-1.5 rounded transition-colors"
                          title="Manual HR Correction"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* MANUAL CORRECTION MODAL (FOR HR / ADMIN ONLY) */}
      {correctionModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xl max-w-md w-full">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#714B67]" />
                <h3 className="font-bold text-sm text-[#2C3E50]">Correct Attendance Entry</h3>
              </div>
              <button onClick={() => setCorrectionModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCorrection} className="p-6 space-y-4 text-xs">
              <div className="bg-slate-50 p-2.5 rounded border border-slate-200 text-slate-700 text-[11px]">
                Modifying attendance changes calculated worked hours. A reason is mandatory and will be saved in the permanent audit trail.
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Check-in Time *</label>
                  <input
                    type="time"
                    required
                    value={editForm.checkIn}
                    onChange={(e) => setEditForm({ ...editForm, checkIn: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Check-out Time *</label>
                  <input
                    type="time"
                    required
                    value={editForm.checkOut}
                    onChange={(e) => setEditForm({ ...editForm, checkOut: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Break Duration (Hours)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="4"
                  value={editForm.breakHours}
                  onChange={(e) => setEditForm({ ...editForm, breakHours: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Mandatory Correction Reason *</label>
                <textarea
                  required
                  rows={2}
                  value={editForm.correctionReason}
                  onChange={(e) => setEditForm({ ...editForm, correctionReason: e.target.value })}
                  placeholder="e.g., Biometric device offline during morning shift, validated by department manager."
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCorrectionModal(false)}
                  className="btn-outline text-xs"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Save Correction &amp; Audit Log
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Diagnostics Modal if toggle fails */}
      {errorInfo && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-5 text-xs space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-bold text-rose-700 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>Attendance Error</span>
              </span>
              <button onClick={() => setErrorInfo(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <p className="text-slate-700">{errorInfo.message}</p>
            <div className="flex justify-end">
              <button onClick={() => setErrorInfo(null)} className="btn-outline text-xs">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- ATTENDANCE POLICY & THRESHOLD MODAL (ADMIN / HR) ----------------- */}
      {policyModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xl max-w-2xl w-full overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 bg-[#714B67] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-white/10 flex items-center justify-center">
                  <Sliders className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Attendance Policy &amp; Work Hour Thresholds</h3>
                  <span className="text-[11px] text-white/80">Configure dynamic status brackets and grace periods</span>
                </div>
              </div>
              <button onClick={() => setPolicyModal(false)} className="text-white/80 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Policy Form */}
            <form onSubmit={handleSavePolicy} className="p-6 space-y-5 text-xs">
              
              {/* Interactive Visual Threshold Bracket */}
              <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700 uppercase tracking-wider">
                  <span>Live Threshold Bracket Visualizer</span>
                  <span className="text-slate-400 font-mono text-[10px]">Auto-Evaluated on Check-Out</span>
                </div>
                
                <div className="grid grid-cols-4 gap-1.5 text-center font-mono text-[11px]">
                  <div className="bg-rose-50 border border-rose-200 text-rose-800 p-2 rounded">
                    <span className="block font-bold text-[10px] uppercase text-rose-600">Short / Incomplete</span>
                    <span className="font-semibold text-xs mt-0.5 block">&lt; {policyForm.halfDayHours}h</span>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 p-2 rounded">
                    <span className="block font-bold text-[10px] uppercase text-amber-600">Half Day</span>
                    <span className="font-semibold text-xs mt-0.5 block">{policyForm.halfDayHours}h - {policyForm.fullDayHours}h</span>
                  </div>
                  <div className="bg-teal-50 border border-teal-200 text-teal-800 p-2 rounded">
                    <span className="block font-bold text-[10px] uppercase text-teal-600">Full Day</span>
                    <span className="font-semibold text-xs mt-0.5 block">{policyForm.fullDayHours}h - {policyForm.overtimeThreshold}h</span>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 text-purple-800 p-2 rounded">
                    <span className="block font-bold text-[10px] uppercase text-[#714B67]">Overtime</span>
                    <span className="font-semibold text-xs mt-0.5 block">&ge; {policyForm.overtimeThreshold}h</span>
                  </div>
                </div>
              </div>

              {/* Form Input Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-slate-700 font-medium mb-1">Policy Title *</label>
                  <input
                    type="text"
                    required
                    value={policyForm.name}
                    onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Full Day Target (Hours) *
                    <span className="text-[10px] text-slate-400 font-normal ml-1">(Marks PRESENT)</span>
                  </label>
                  <input
                    type="number"
                    required
                    step="0.5"
                    min="5"
                    max="12"
                    value={policyForm.fullDayHours}
                    onChange={(e) => setPolicyForm({ ...policyForm, fullDayHours: parseFloat(e.target.value) || 7.0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Half Day Minimum (Hours) *
                    <span className="text-[10px] text-slate-400 font-normal ml-1">(Marks HALF_DAY)</span>
                  </label>
                  <input
                    type="number"
                    required
                    step="0.5"
                    min="2"
                    max="6"
                    value={policyForm.halfDayHours}
                    onChange={(e) => setPolicyForm({ ...policyForm, halfDayHours: parseFloat(e.target.value) || 4.0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Late Grace Period (Minutes) *
                    <span className="text-[10px] text-slate-400 font-normal ml-1">(Grace past start time)</span>
                  </label>
                  <input
                    type="number"
                    required
                    step="1"
                    min="0"
                    max="60"
                    value={policyForm.gracePeriodMins}
                    onChange={(e) => setPolicyForm({ ...policyForm, gracePeriodMins: parseInt(e.target.value, 10) || 15 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Overtime Threshold (Hours) *
                    <span className="text-[10px] text-slate-400 font-normal ml-1">(Triggers OVERTIME)</span>
                  </label>
                  <input
                    type="number"
                    required
                    step="0.5"
                    min="8"
                    max="16"
                    value={policyForm.overtimeThreshold}
                    onChange={(e) => setPolicyForm({ ...policyForm, overtimeThreshold: parseFloat(e.target.value) || 9.0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Meal Break Auto-Deduction (Hours)
                    <span className="text-[10px] text-slate-400 font-normal ml-1">(When worked &gt; 5h)</span>
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="3"
                    value={policyForm.breakDeductionHours}
                    onChange={(e) => setPolicyForm({ ...policyForm, breakDeductionHours: parseFloat(e.target.value) || 1.0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    Ghost Shift Auto-Cap (Hours)
                    <span className="text-[10px] text-slate-400 font-normal ml-1">(Overnight session cap)</span>
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="10"
                    max="24"
                    value={policyForm.maxShiftHoursCap}
                    onChange={(e) => setPolicyForm({ ...policyForm, maxShiftHoursCap: parseFloat(e.target.value) || 14.0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>
              </div>

              {/* Compliance & Audit Footer Note */}
              <div className="bg-teal-50 border border-teal-200 p-3 rounded text-[11px] text-teal-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#00A09D] shrink-0" />
                <span>
                  Admin updates take effect immediately. All modifications are permanently logged to the system audit trail.
                </span>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setPolicyModal(false)}
                  className="btn-outline text-xs px-3 py-1.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPolicy}
                  className="btn-primary text-xs px-4 py-1.5 flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{savingPolicy ? 'Applying Rules...' : 'Save Policy Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Feedback Notification */}
      {policyToast && (
        <div className="fixed top-20 right-6 z-50 bg-[#00A09D] text-white px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top-2 border border-teal-600">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />
          <span>{policyToast}</span>
        </div>
      )}
    </div>
  );
}

