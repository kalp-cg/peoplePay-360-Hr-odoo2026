import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plane, Plus, CheckCircle, XCircle, Clock, Check, AlertCircle, X } from 'lucide-react';
import api from '../api/client';
import ControlPanel from '../components/ControlPanel';
import { useAuth } from '../context/AuthContext';
import { formatPeriodRange } from '../utils/formatters';

export default function TimeOff() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const employeeIdParam = searchParams.get('employeeId');
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState(tabParam || 'requests'); // 'requests' | 'allocations' | 'types'
  const [requests, setRequests] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Submit Request Modal
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [reqForm, setReqForm] = useState({
    timeOffTypeId: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date().toISOString().slice(0, 10),
    durationDays: 1.0,
    reason: '',
  });

  // Create Allocation Modal
  const [showAllocModal, setShowAllocModal] = useState(false);
  const [allocForm, setAllocForm] = useState({
    employeeId: employeeIdParam || '',
    timeOffTypeId: '',
    allocatedDays: 20,
    year: 2026,
  });

  // Create Type Modal
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [typeForm, setTypeForm] = useState({
    name: '',
    unit: 'DAYS',
    allocationRequired: true,
    approvalRequired: true,
    payrollIntegration: true,
    isPaid: true,
  });

  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    fetchData();
  }, [activeTab, employeeIdParam]);

  async function fetchData() {
    setLoading(true);
    try {
      const params = {};
      if (employeeIdParam) params.employeeId = employeeIdParam;

      if (activeTab === 'requests') {
        const res = await api.get('/time-off/requests', { params });
        setRequests(res.data);
      } else if (activeTab === 'allocations') {
        const res = await api.get('/time-off/allocations', { params });
        setAllocations(res.data);
      } else if (activeTab === 'types') {
        const res = await api.get('/time-off/types');
        setTypes(res.data);
      }
      // fetch types for dropdown
      const tRes = await api.get('/time-off/types');
      setTypes(tRes.data);
      if (tRes.data.length > 0 && !reqForm.timeOffTypeId) {
        setReqForm((prev) => ({ ...prev, timeOffTypeId: tRes.data[0].id }));
      }
      const empRes = await api.get('/employees');
      setEmployees(empRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitRequest(e) {
    e.preventDefault();
    try {
      await api.post('/time-off/requests', reqForm);
      setShowRequestModal(false);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to submit leave request');
    }
  }

  async function handleApprove(id) {
    try {
      await api.patch(`/time-off/requests/${id}/approve`);
      fetchData();
    } catch (err) {
      alert(err.message || 'Approval failed');
    }
  }

  async function handleReject(id) {
    const reason = prompt('Please enter the reason for refusing this leave request:');
    if (reason === null) return;
    try {
      await api.patch(`/time-off/requests/${id}/reject`, { rejectionReason: reason });
      fetchData();
    } catch (err) {
      alert(err.message || 'Refusal failed');
    }
  }

  async function handleCreateAllocation(e) {
    e.preventDefault();
    try {
      await api.post('/time-off/allocations', allocForm);
      setShowAllocModal(false);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to create allocation');
    }
  }

  async function handleCreateType(e) {
    e.preventDefault();
    try {
      await api.post('/time-off/types', typeForm);
      setShowTypeModal(false);
      setTypeForm({
        name: '',
        unit: 'DAYS',
        allocationRequired: true,
        approvalRequired: true,
        payrollIntegration: true,
        isPaid: true,
      });
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to create time off type');
    }
  }

  const isEmployee = user?.role === 'EMPLOYEE';
  const isHR = user?.role === 'ADMIN' || user?.role === 'HR_MANAGER' || user?.role === 'HR_PAYROLL_MANAGER';

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-12">
      <ControlPanel
        title={isEmployee ? 'My Time Off & Leaves' : 'Time Off & Leaves'}
        subtitle={isEmployee ? 'Personal Leave Balances, Applications & Approval Status' : 'Leave Requests, Allocation Ledger & Approvals'}
        breadcrumbs={[{ label: 'Dashboard', path: '/' }, { label: 'Time Off' }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRequestModal(true)}
              className="btn-primary text-xs flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Submit Leave Request</span>
            </button>
            {isHR && activeTab === 'allocations' && (
              <button
                onClick={() => setShowAllocModal(true)}
                className="btn-secondary text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Allocation</span>
              </button>
            )}
            {isHR && activeTab === 'types' && (
              <button
                onClick={() => setShowTypeModal(true)}
                className="btn-secondary text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Leave Type</span>
              </button>
            )}
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-4">
        
        {/* Employee Balance Summary Cards */}
        {isEmployee && allocations.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {allocations.map(alloc => (
              <div key={alloc.id} className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                <div className="text-xs font-semibold text-slate-500 uppercase">{alloc.timeOffType?.name || 'Leave'}</div>
                <div className="text-2xl font-extrabold text-[#714B67] mt-1 font-mono">
                  {alloc.remainingDays ?? (alloc.allocatedDays - (alloc.takenDays || 0))} Days
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Allocated: {alloc.allocatedDays}d • Taken: {alloc.takenDays || 0}d
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="bg-white border border-slate-200 rounded-lg px-4 flex gap-6 text-xs font-semibold shadow-sm overflow-x-auto">
          <button
            onClick={() => setActiveTab('requests')}
            className={`py-3.5 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'requests'
                ? 'border-[#714B67] text-[#714B67]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>{isEmployee ? 'My Leave Requests' : 'Time Off Requests'}</span>
          </button>
          <button
            onClick={() => setActiveTab('allocations')}
            className={`py-3.5 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'allocations'
                ? 'border-[#714B67] text-[#714B67]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            <span>{isHR ? 'Leave Allocations Ledger' : 'My Leave Balances'}</span>
          </button>
          {isHR && (
            <button
              onClick={() => setActiveTab('types')}
              className={`py-3.5 border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === 'types'
                  ? 'border-[#714B67] text-[#714B67]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Plane className="w-4 h-4" />
              <span>Time Off Types</span>
            </button>
          )}
        </div>

        {/* ----------------- TAB 1: REQUESTS ----------------- */}
        {activeTab === 'requests' && (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  {!isEmployee && <th className="px-4 py-3">Employee</th>}
                  <th className="px-4 py-3">Leave Type</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Duration</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                  {isHR && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                    {!isEmployee && (
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {req.employee?.name}
                        <span className="ml-1 text-[11px] text-slate-400 font-mono">({req.employee?.employeeId})</span>
                      </td>
                    )}
                    <td className="px-4 py-3 font-medium text-[#714B67]">{req.timeOffType?.name}</td>
                    <td className="px-4 py-3 font-mono">
                      {formatPeriodRange(req.startDate, req.endDate)}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800">{req.durationDays} Days</td>
                    <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate" title={req.reason}>
                      {req.reason || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                        req.status === 'APPROVED'
                          ? 'bg-teal-50 text-[#00A09D] border-[#00A09D]/30'
                          : req.status === 'PENDING'
                          ? 'bg-purple-50 text-[#714B67] border-[#714B67]/30'
                          : 'bg-slate-100 text-slate-700 border-slate-300'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {req.status === 'PENDING' && isHR && (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleApprove(req.id)}
                            className="btn-secondary text-[11px] py-1 px-2.5"
                            title="Approve & Automatically Deduct from Allocation"
                          >
                            <Check className="w-3 h-3" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleReject(req.id)}
                            className="btn-outline text-[11px] py-1 px-2 text-rose-700 hover:bg-rose-50"
                            title="Refuse"
                          >
                            <X className="w-3 h-3" />
                            <span>Refuse</span>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ----------------- TAB 2: ALLOCATIONS LEDGER ----------------- */}
        {activeTab === 'allocations' && (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  {!isEmployee && <th className="px-4 py-3">Employee</th>}
                  <th className="px-4 py-3">Leave Type</th>
                  <th className="px-4 py-3 font-mono">Allocated</th>
                  <th className="px-4 py-3 font-mono">Taken / Approved</th>
                  <th className="px-4 py-3 font-mono">Remaining Balance</th>
                  <th className="px-4 py-3">Year</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {allocations.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                    {!isEmployee && (
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {a.employee?.name}
                        <span className="ml-1 text-[11px] text-slate-400 font-mono">({a.employee?.employeeId})</span>
                      </td>
                    )}
                    <td className="px-4 py-3 font-semibold text-[#714B67]">{a.timeOffType?.name}</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-800">{a.allocatedDays} Days</td>
                    <td className="px-4 py-3 font-mono text-slate-500">{a.takenDays || 0} Days</td>
                    <td className="px-4 py-3 font-mono font-extrabold text-teal-700">{a.remainingDays} Days</td>
                    <td className="px-4 py-3 font-mono text-slate-400">{a.year}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ----------------- TAB 3: TYPES ----------------- */}
        {activeTab === 'types' && (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Leave Type Name</th>
                  <th className="px-4 py-3">Unit</th>
                  <th className="px-4 py-3">Allocation Required</th>
                  <th className="px-4 py-3">Approval Required</th>
                  <th className="px-4 py-3">Payroll Integration</th>
                  <th className="px-4 py-3">Is Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {types.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900">{t.name}</td>
                    <td className="px-4 py-3">{t.unit}</td>
                    <td className="px-4 py-3">{t.allocationRequired ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3">{t.approvalRequired ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3">{t.payrollIntegration ? 'Yes (Reflected in Payslip)' : 'No'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        t.isPaid ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {t.isPaid ? 'Paid' : 'Unpaid'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* SUBMIT REQUEST MODAL */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <h3 className="font-bold text-sm text-[#2C3E50]">Submit Time Off Request</h3>
              <button onClick={() => setShowRequestModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Time Off Type *</label>
                <select
                  required
                  value={reqForm.timeOffTypeId}
                  onChange={(e) => setReqForm({ ...reqForm, timeOffTypeId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                >
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>{t.name} ({t.isPaid ? 'Paid' : 'Unpaid'})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={reqForm.startDate}
                    onChange={(e) => setReqForm({ ...reqForm, startDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={reqForm.endDate}
                    onChange={(e) => setReqForm({ ...reqForm, endDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Duration (Days) *</label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={reqForm.durationDays}
                  onChange={(e) => setReqForm({ ...reqForm, durationDays: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Reason</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Annual leave for family function"
                  value={reqForm.reason}
                  onChange={(e) => setReqForm({ ...reqForm, reason: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-200">
                <button type="button" onClick={() => setShowRequestModal(false)} className="btn-outline text-xs">
                  Discard
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE ALLOCATION MODAL (HR ONLY) */}
      {showAllocModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <h3 className="font-bold text-sm text-[#2C3E50]">Assign Leave Allocation</h3>
              <button onClick={() => setShowAllocModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAllocation} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Employee *</label>
                <select
                  required
                  value={allocForm.employeeId}
                  onChange={(e) => setAllocForm({ ...allocForm, employeeId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                >
                  <option value="">Select Employee</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name} ({e.employeeId})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Time Off Type *</label>
                  <select
                    required
                    value={allocForm.timeOffTypeId}
                    onChange={(e) => setAllocForm({ ...allocForm, timeOffTypeId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  >
                    <option value="">Select Type</option>
                    {types.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Days to Allocate *</label>
                  <input
                    type="number"
                    required
                    value={allocForm.allocatedDays}
                    onChange={(e) => setAllocForm({ ...allocForm, allocatedDays: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-200">
                <button type="button" onClick={() => setShowAllocModal(false)} className="btn-outline text-xs">
                  Discard
                </button>
                <button type="submit" className="btn-secondary text-xs">
                  Assign Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Configure Leave Type Modal */}
      {showTypeModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <h3 className="font-bold text-sm text-[#2C3E50]">Configure Leave Type</h3>
              <button onClick={() => setShowTypeModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateType} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Annual Leave"
                    value={typeForm.name}
                    onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AL"
                    value={typeForm.code}
                    onChange={(e) => setTypeForm({ ...typeForm, code: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs uppercase focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Classification *</label>
                  <select
                    value={typeForm.type}
                    onChange={(e) => setTypeForm({ ...typeForm, type: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  >
                    <option value="PAID">Paid Leave</option>
                    <option value="UNPAID">Unpaid Leave</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Default Days/Year</label>
                  <input
                    type="number"
                    value={typeForm.defaultDays}
                    onChange={(e) => setTypeForm({ ...typeForm, defaultDays: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="reqAppr"
                  checked={typeForm.requiresApproval}
                  onChange={(e) => setTypeForm({ ...typeForm, requiresApproval: e.target.checked })}
                  className="rounded text-[#714B67] focus:ring-[#714B67]"
                />
                <label htmlFor="reqAppr" className="text-slate-700 font-medium">Requires Manager Approval</label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-200">
                <button type="button" onClick={() => setShowTypeModal(false)} className="btn-outline text-xs">
                  Discard
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Create Leave Type
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
