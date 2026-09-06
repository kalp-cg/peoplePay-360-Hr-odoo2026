import React, { useState, useEffect } from 'react';
import { 
  Users, CalendarCheck, Clock, CheckCircle2, XCircle, AlertTriangle, 
  RefreshCw, Check, X, ShieldAlert, FileText, ArrowRight, Building2, UserCheck
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, 
  PieChart, Pie, Cell 
} from 'recharts';
import { Link } from 'react-router-dom';
import api from '../../api/client';
import ControlPanel from '../../components/ControlPanel';
import { useAuth } from '../../context/AuthContext';

export default function HRManagerDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [profileRequests, setProfileRequests] = useState([]);
  const [rejectModal, setRejectModal] = useState({ open: false, type: '', id: null, reason: '' });
  const [statusMessage, setStatusMessage] = useState(null);

  useEffect(() => {
    fetchHRDashboard();
  }, []);

  async function fetchHRDashboard() {
    setLoading(true);
    try {
      const [dashRes, leavesRes, reqsRes] = await Promise.allSettled([
        api.get('/dashboard'),
        api.get('/time-off/requests', { params: { status: 'PENDING' } }),
        api.get('/employees/profile-change-requests', { params: { status: 'PENDING' } }),
      ]);
      if (dashRes.status === 'fulfilled') setDashboardData(dashRes.value.data);
      if (leavesRes.status === 'fulfilled') {
        const raw = leavesRes.value.data?.data || leavesRes.value.data || [];
        const arr = Array.isArray(raw) ? raw : [];
        setPendingLeaves(arr.filter(l => l.status === 'PENDING'));
      }
      if (reqsRes.status === 'fulfilled') {
        const rawReqs = reqsRes.value.data?.data || reqsRes.value.data || [];
        setProfileRequests(Array.isArray(rawReqs) ? rawReqs : []);
      }
    } catch (err) {
      console.error('Failed to load HR Dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  // Handle Leave Approvals
  async function handleApproveLeave(id) {
    setActionLoading(true);
    setPendingLeaves(prev => prev.filter(l => l.id !== id));
    try {
      await api.patch(`/time-off/requests/${id}/approve`);
      setStatusMessage({ type: 'success', text: 'Leave request approved successfully.' });
      await fetchHRDashboard();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to approve leave' });
      await fetchHRDashboard();
    } finally {
      setActionLoading(false);
    }
  }

  // Handle Profile Requests Approval
  async function handleApproveProfileRequest(id) {
    setActionLoading(true);
    setProfileRequests(prev => prev.filter(r => r.id !== id));
    try {
      await api.patch(`/employees/profile-change-requests/${id}/approve`);
      setStatusMessage({ type: 'success', text: 'Profile changes approved and applied directly to employee record!' });
      await fetchHRDashboard();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to approve profile request' });
      await fetchHRDashboard();
    } finally {
      setActionLoading(false);
    }
  }

  // Open Rejection Dialog
  function openReject(type, id) {
    setRejectModal({ open: true, type, id, reason: '' });
  }

  // Submit Rejection
  async function submitReject() {
    if (!rejectModal.reason.trim()) {
      alert('Please provide a rejection reason.');
      return;
    }
    const { type, id, reason } = rejectModal;
    setActionLoading(true);
    if (type === 'leave') {
      setPendingLeaves(prev => prev.filter(l => l.id !== id));
    } else if (type === 'profile') {
      setProfileRequests(prev => prev.filter(r => r.id !== id));
    }
    setRejectModal({ open: false, type: '', id: null, reason: '' });

    try {
      if (type === 'leave') {
        await api.patch(`/time-off/requests/${id}/reject`, { rejectionReason: reason });
        setStatusMessage({ type: 'success', text: 'Leave request rejected.' });
      } else if (type === 'profile') {
        await api.patch(`/employees/profile-change-requests/${id}/reject`, { reviewerNotes: reason });
        setStatusMessage({ type: 'success', text: 'Profile change request rejected.' });
      }
      await fetchHRDashboard();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to reject request' });
      await fetchHRDashboard();
    } finally {
      setActionLoading(false);
    }
  }

  const kpis = dashboardData?.kpis || {};
  const charts = dashboardData?.charts || { departmentSalaryCost: [], attendanceDistribution: [] };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-12">
      <ControlPanel
        title="HR Operations & People Overview"
        subtitle={`Welcome, ${user?.name || 'HR Manager'} • Real-Time Employee Lifecycle, Leave & Profile Management`}
        breadcrumbs={[{ label: 'Dashboard' }, { label: 'HR Manager Overview' }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchHRDashboard}
              className="btn-outline text-xs flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <Link to="/employees" className="btn-primary text-xs flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" />
              <span>Employees Directory</span>
            </Link>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">

        {statusMessage && (
          <div className={`p-4 rounded-lg text-xs flex items-center justify-between border ${
            statusMessage.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            <span>{statusMessage.text}</span>
            <button onClick={() => setStatusMessage(null)} className="font-bold hover:opacity-75">✕</button>
          </div>
        )}

        {/* 4 Executive HR KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Active Headcount */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Total Active Headcount</span>
              <span className="p-1.5 rounded bg-[#714B67]/10 text-[#714B67]">
                <Users className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-extrabold text-[#2C3E50] mt-2 font-mono">
              {dashboardData?.totalEmployees || 12}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
              <span className="text-[#00A09D] font-semibold">100%</span>
              <span>with active employment contracts</span>
            </div>
          </div>

          {/* Pending Profile Change Requests */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm relative overflow-hidden">
            {profileRequests.length > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
            )}
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Profile Update Requests</span>
              <span className="p-1.5 rounded bg-amber-50 text-amber-600">
                <UserCheck className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-extrabold text-amber-700 mt-2 font-mono">
              {profileRequests.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {profileRequests.length === 0 ? 'All employee records up to date' : 'Require HR Manager approval'}
            </div>
          </div>

          {/* Pending Leave Approvals */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm relative overflow-hidden">
            {pendingLeaves.length > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
            )}
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Pending Leave Approvals</span>
              <span className="p-1.5 rounded bg-rose-50 text-rose-600">
                <CalendarCheck className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-extrabold text-rose-700 mt-2 font-mono">
              {pendingLeaves.length}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {pendingLeaves.length === 0 ? 'No requests awaiting review' : 'Action required in approval queue'}
            </div>
          </div>

          {/* Attendance Health */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Attendance Health</span>
              <span className="p-1.5 rounded bg-[#00A09D]/10 text-[#00A09D]">
                <Clock className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-extrabold text-[#00A09D] mt-2 font-mono">
              {kpis.attendanceHealthPercent || 94.5}%
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              On-time ratio across active shifts
            </div>
          </div>

        </div>

        {/* SECTION 1: PENDING PROFILE CHANGE REQUESTS (HR APPROVAL WORKFLOW) */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-[#714B67]" />
              <h3 className="font-semibold text-slate-800 text-sm">
                Employee Profile Change Requests Awaiting HR Approval
              </h3>
            </div>
            <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full font-semibold">
              {profileRequests.length} Pending
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Requested Field Updates</th>
                  <th className="px-4 py-3">Employee Reason / Justification</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3 text-right">HR Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {profileRequests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400">
                      <div className="flex flex-col items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                        <span>No pending profile changes. All employee records are up to date!</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  profileRequests.map((req) => {
                    const changes = req.requestedChanges || {};
                    return (
                      <tr key={req.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900">{req.employee?.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {req.employee?.employeeId} • {req.employee?.department?.name || 'Department'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5 max-w-md">
                            {Object.entries(changes).map(([k, v]) => (
                              <span key={k} className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                                <strong className="text-slate-700 capitalize">{k}:</strong>
                                <span className="text-[#00A09D] font-mono font-medium">{String(v)}</span>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 max-w-xs text-slate-600 italic">
                          "{req.reason || 'No justification provided'}"
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleApproveProfileRequest(req.id)}
                              disabled={actionLoading}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium text-xs shadow-xs transition-colors flex items-center gap-1"
                              title="Approve & Apply to Employee Database"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => openReject('profile', req.id)}
                              disabled={actionLoading}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded font-medium text-xs transition-colors flex items-center gap-1"
                              title="Reject Request"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 2: PENDING LEAVE APPROVALS QUEUE */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <CalendarCheck className="w-4 h-4 text-[#00A09D]" />
              <h3 className="font-semibold text-slate-800 text-sm">
                Pending Time Off & Leave Approvals Queue
              </h3>
            </div>
            <Link to="/time-off" className="text-xs text-[#714B67] hover:underline flex items-center gap-1">
              <span>View All Leaves</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Leave Type</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3 text-right">Approval Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {pendingLeaves.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-slate-400">
                      No pending leave requests.
                    </td>
                  </tr>
                ) : (
                  pendingLeaves.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-900">{l.employee?.name}</span>
                        <span className="text-slate-400 font-mono text-[11px] block">{l.employee?.employeeId}</span>
                      </td>
                      <td className="px-4 py-3 font-medium text-purple-700">
                        {l.timeOffType?.name || 'Paid Time Off'}
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px]">
                        {new Date(l.startDate).toLocaleDateString()} &rarr; {new Date(l.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 font-bold font-mono text-slate-800">
                        {l.durationDays} Days
                      </td>
                      <td className="px-4 py-3 max-w-xs text-slate-600 truncate">
                        {l.reason || '-'}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApproveLeave(l.id)}
                            disabled={actionLoading}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-medium text-xs shadow-xs transition-colors flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => openReject('leave', l.id)}
                            disabled={actionLoading}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded font-medium text-xs transition-colors flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 3: CHARTS (Department Distribution & Attendance) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-bold text-[#2C3E50] mb-4">Department Cost & Headcount Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.departmentSalaryCost}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="department" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Total Cost']} />
                  <Bar dataKey="totalCost" fill="#714B67" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-bold text-[#2C3E50] mb-4">Workforce Attendance Health Ratio</h3>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={
                      charts.attendanceDistribution?.length > 0 && charts.attendanceDistribution.some(d => d.count > 0)
                        ? charts.attendanceDistribution.map(d => ({ name: d.name, value: d.count, fill: d.fill }))
                        : [
                            { name: 'Present', value: 1, fill: '#00A09D' },
                          ]
                    }
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {(charts.attendanceDistribution || []).map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.fill || '#714B67'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>

      {/* REJECTION MODAL */}
      {rejectModal.open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xl max-w-md w-full">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-rose-50">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-700" />
                <h3 className="font-bold text-sm text-rose-900">
                  Reject {rejectModal.type === 'profile' ? 'Profile Change Request' : 'Time Off Request'}
                </h3>
              </div>
              <button onClick={() => setRejectModal({ open: false, type: '', id: null, reason: '' })} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-600">
                Please provide an official reason for rejecting this request. This will be communicated to the employee in their self-service portal.
              </p>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Rejection Reason *</label>
                <textarea
                  required
                  rows={3}
                  value={rejectModal.reason}
                  onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                  placeholder="e.g., PAN format does not match official tax records, please resubmit with proof."
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRejectModal({ open: false, type: '', id: null, reason: '' })}
                  className="btn-outline text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={submitReject}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold"
                >
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
