import React, { useState, useEffect } from 'react';
import { 
  Clock, Plus, Edit2, CheckCircle2, AlertTriangle, X, ShieldAlert, 
  Calendar, Check, RefreshCw, AlertCircle, Copy
} from 'lucide-react';
import api from '../api/client';
import ControlPanel from '../components/ControlPanel';
import { useAuth } from '../context/AuthContext';

export default function Attendance() {
  const { user } = useAuth();
  const isEmployee = user?.role === 'EMPLOYEE';
  const canCorrect = ['ADMIN', 'HR_MANAGER'].includes(user?.role);

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);

  // Employee Quick Toggle State
  const [attStatus, setAttStatus] = useState({ checkedIn: false, elapsedHours: 0, loading: false });
  const [errorInfo, setErrorInfo] = useState(null);
  const [copied, setCopied] = useState(false);

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
    if (isEmployee) {
      fetchCurrentStatus();
    }
  }, [statusFilter, isEmployee]);

  async function fetchAttendance() {
    setLoading(true);
    try {
      const res = await api.get('/attendance', { params: { status: statusFilter || undefined } });
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

  async function handleToggleAttendance() {
    setAttStatus((prev) => ({ ...prev, loading: true }));
    try {
      await api.post('/attendance/quick-toggle');
      await Promise.all([fetchCurrentStatus(), fetchAttendance()]);
    } catch (err) {
      console.error('[Attendance Toggle Error]:', err);
      setErrorInfo({
        action: 'Attendance Toggle',
        message: err.message || 'Failed to toggle attendance status.',
        user: { name: user?.name, email: user?.email, role: user?.role, employeeId: user?.employeeId },
        timestamp: new Date().toISOString(),
      });
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
  const presentDays = filtered.filter(r => r.status === 'PRESENT' || r.status === 'OVERTIME' || r.status === 'LATE').length;
  const onTimeDays = filtered.filter(r => r.status === 'PRESENT' || r.status === 'OVERTIME').length;
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
          <button
            onClick={() => { fetchAttendance(); if (isEmployee) fetchCurrentStatus(); }}
            className="btn-outline text-xs flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
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

              <button
                onClick={handleToggleAttendance}
                disabled={attStatus.loading}
                className={`px-5 py-2.5 rounded text-xs font-semibold shadow-sm transition-all flex items-center gap-2 ${
                  attStatus.checkedIn
                    ? 'bg-[#714B67] hover:bg-[#5d3d54] text-white'
                    : 'bg-[#00A09D] hover:bg-[#008b88] text-white'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>
                  {attStatus.loading 
                    ? 'Updating Punch...' 
                    : attStatus.checkedIn 
                    ? 'Check Out for Today' 
                    : (attStatus.hasCheckedOutToday || attStatus.workedHours > 0)
                    ? 'Check In Again / Resume Shift'
                    : 'Check In for Today'}
                </span>
              </button>
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
              {['', 'PRESENT', 'LATE', 'OVERTIME', 'ABSENT', 'CORRECTED'].map((s) => (
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
                      {new Date(rec.date).toLocaleDateString()}
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
    </div>
  );
}
