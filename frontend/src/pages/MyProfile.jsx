import React, { useState, useEffect } from 'react';
import { 
  User, Mail, Phone, Building2, Briefcase, Calendar, CreditCard, 
  FileText, ShieldCheck, Clock, CheckCircle2, AlertCircle, Edit3, 
  Send, RefreshCw, X, ShieldAlert, ArrowRight, Check, History
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import ControlPanel from '../components/ControlPanel';
import { useAuth } from '../context/AuthContext';
import { formatDateDMY } from '../utils/formatters';

export default function MyProfile() {
  const { user } = useAuth();
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    bankName: '',
    bankAccountNumber: '',
    bankIfscCode: '',
    panNumber: '',
    reason: '',
  });

  useEffect(() => {
    fetchProfileData();
  }, [user]);

  async function fetchProfileData() {
    setLoading(true);
    try {
      // 1. Get employee data (/employees returns a { data, total, page, ... } envelope)
      const empRes = await api.get('/employees');
      const empList = Array.isArray(empRes.data) ? empRes.data : (empRes.data?.data ?? []);
      const self = empList.find(e => e.id === user?.employeeId) || empList[0];
      if (self) {
        const fullDetail = await api.get(`/employees/${self.id}`);
        setEmployee(fullDetail.data);
        setForm({
          name: fullDetail.data.name || '',
          email: fullDetail.data.email || '',
          phone: fullDetail.data.phone || '',
          bankName: fullDetail.data.bankName || '',
          bankAccountNumber: fullDetail.data.bankAccountNumber || '',
          bankIfscCode: fullDetail.data.bankIfscCode || '',
          panNumber: fullDetail.data.panNumber || '',
          reason: '',
        });
      }

      // 2. Fetch employee's change requests history
      try {
        const reqRes = await api.get('/employees/profile-change-requests');
        setRequests(reqRes.data || []);
      } catch (err) {
        console.warn('Profile requests fetch error:', err);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitRequest(e) {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const payload = {
        requestedChanges: {
          name: form.name?.trim() || employee?.name,
          email: form.email?.trim() || employee?.email,
          phone: form.phone?.trim() || employee?.phone,
          bankName: form.bankName?.trim() || employee?.bankName,
          bankAccountNumber: form.bankAccountNumber?.trim() || employee?.bankAccountNumber,
          bankIfscCode: form.bankIfscCode?.trim() || employee?.bankIfscCode,
          panNumber: form.panNumber?.trim() || employee?.panNumber,
        },
        reason: form.reason || 'Personal and banking details update requested by employee',
      };

      await api.post('/employees/profile-change-requests', payload);
      setFeedback({
        type: 'success',
        text: 'Your profile update request has been submitted to the HR Manager for approval! Once approved, your employee record and user profile will be automatically updated.',
      });
      setShowEditModal(false);
      // Refresh requests
      const reqRes = await api.get('/employees/profile-change-requests');
      setRequests(reqRes.data || []);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to submit profile update request.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  const activeContract = employee?.contracts?.find(c => c.status === 'ACTIVE');
  const pendingRequestsCount = requests.filter(r => r.status === 'PENDING').length;

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-12">
      <ControlPanel
        title="My Employee Profile"
        subtitle="Self-Service Personal Record, Statutory Details & HR Change Requests"
        breadcrumbs={[{ label: 'Dashboard', path: '/' }, { label: 'My Profile' }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchProfileData}
              className="btn-outline text-xs flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setShowEditModal(true)}
              className="btn-primary text-xs flex items-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Request Profile Update</span>
            </button>
          </div>
        }
      />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">

        {feedback && (
          <div className={`p-4 rounded-lg text-xs flex items-center justify-between border ${
            feedback.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}>
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertCircle className="w-4 h-4 text-rose-600" />}
              <span>{feedback.text}</span>
            </div>
            <button onClick={() => setFeedback(null)} className="font-bold hover:opacity-75">✕</button>
          </div>
        )}

        {/* Main Odoo Sheet Card */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          
          {/* Header Banner */}
          <div className="p-6 border-b border-slate-200 bg-linear-to-r from-slate-50 via-white to-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-full bg-[#714B67] text-white flex items-center justify-center font-bold text-2xl shadow-sm">
                {(employee?.name || user?.name || 'EM').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-bold text-[#2C3E50]">{employee?.name || user?.name}</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {employee?.status || 'ACTIVE'}
                  </span>
                </div>
                <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                  <span className="font-mono font-medium text-slate-700">{employee?.employeeId || 'EMP001'}</span>
                  <span>•</span>
                  <span>{employee?.jobPosition?.title || 'Software Engineer'}</span>
                  <span>•</span>
                  <span>{employee?.department?.name || 'Technology Department'}</span>
                </div>
              </div>
            </div>

            {/* Smart Buttons Strip */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="px-3 py-2 bg-slate-50 rounded border border-slate-200 text-center min-w-[100px]">
                <div className="text-[10px] text-slate-500 font-semibold uppercase">Contract Wage</div>
                <div className="text-sm font-extrabold text-[#2C3E50] font-mono">
                  ₹{Number(activeContract?.wage || 50000).toLocaleString()}
                </div>
              </div>
              <div className="px-3 py-2 bg-slate-50 rounded border border-slate-200 text-center min-w-[100px]">
                <div className="text-[10px] text-slate-500 font-semibold uppercase">Leave Balance</div>
                <div className="text-sm font-extrabold text-[#00A09D] font-mono">
                  {employee?.smartButtons?.timeOffRemainingDays ?? 20} Days
                </div>
              </div>
              <div className="px-3 py-2 bg-slate-50 rounded border border-slate-200 text-center min-w-[100px]">
                <div className="text-[10px] text-slate-500 font-semibold uppercase">Attendance</div>
                <div className="text-sm font-extrabold text-[#714B67] font-mono">
                  {employee?.smartButtons?.attendanceHealthPercent ?? 96}%
                </div>
              </div>
            </div>
          </div>

          {/* Sheet Body: 2 Columns */}
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
            
            {/* Column 1: Organization & Work Info */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-[#714B67] uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5" />
                <span>Work & Employment Information</span>
              </h3>

              <div className="space-y-3 text-slate-700">
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Department</span>
                  <span className="font-semibold text-slate-900">{employee?.department?.name || 'Engineering'}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Designation / Job Role</span>
                  <span className="font-semibold text-slate-900">{employee?.jobPosition?.title || 'Senior Engineer'}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Employment Type</span>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[11px]">
                    {employee?.employeeType || 'FULL_TIME'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Joining Date</span>
                  <span className="font-mono text-slate-900">
                    {formatDateDMY(employee?.joiningDate || '2026-01-01')}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Working Schedule</span>
                  <span className="font-semibold text-slate-900">{employee?.workingSchedule?.name || 'Standard 40 Hours (Mon - Fri)'}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 font-medium">Reporting Manager</span>
                  <span className="font-semibold text-slate-900">{employee?.manager?.name || 'Executive HR'}</span>
                </div>
              </div>
            </div>

            {/* Column 2: Personal, Banking & Statutory */}
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-xs font-bold text-[#00A09D] uppercase tracking-wider flex items-center gap-2">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Personal, Banking & Statutory Details</span>
                </h3>
                <span className="text-[10px] text-slate-400">Locked for Direct Edit</span>
              </div>

              <div className="space-y-3 text-slate-700">
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Official Work Email</span>
                  <span className="font-mono text-slate-900">{employee?.email || user?.email}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Contact Phone</span>
                  <span className="font-mono font-semibold text-slate-900">{employee?.phone || '+91 98765 43210'}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Bank Name</span>
                  <span className="font-semibold text-slate-900">{employee?.bankName || 'HDFC Bank'}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Bank Account Number</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {employee?.bankAccountNumber || '••••••••1234'}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500 font-medium">Bank IFSC Code</span>
                  <span className="font-mono font-semibold text-slate-900">{employee?.bankIfscCode || 'HDFC0001234'}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500 font-medium">Income Tax PAN Number</span>
                  <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                    {employee?.panNumber || 'ABCDE1234F'}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-teal-50/60 rounded border border-[#00A09D]/20 text-[11px] text-teal-900 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#00A09D] shrink-0 mt-0.5" />
                <span>
                  For compliance and anti-fraud verification, banking and PAN changes must be requested through HR verification. Click <strong>"Request Profile Update"</strong> above to submit modifications.
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* PROFILE CHANGE REQUESTS AUDIT TRAIL TABLE */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#714B67]" />
              <h3 className="font-semibold text-slate-800 text-sm">
                My Profile Change Requests & HR Verification Status
              </h3>
            </div>
            {pendingRequestsCount > 0 && (
              <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full font-semibold">
                {pendingRequestsCount} Awaiting Review
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="px-4 py-3">Date Submitted</th>
                  <th className="px-4 py-3">Requested Field Updates</th>
                  <th className="px-4 py-3">Justification Reason</th>
                  <th className="px-4 py-3">HR Reviewer Notes</th>
                  <th className="px-4 py-3 text-right">Verification Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-slate-400">
                      No profile change requests submitted yet.
                    </td>
                  </tr>
                ) : (
                  requests.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono text-slate-600">
                        {formatDateDMY(req.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5 max-w-md">
                          {Object.entries(req.requestedChanges || {}).map(([k, v]) => (
                            <span key={k} className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                              <strong className="text-slate-700 capitalize">{k}:</strong>
                              <span className="text-[#00A09D] font-mono">{String(v)}</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-xs text-slate-600 italic">
                        "{req.reason}"
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-medium">
                        {req.reviewNotes || req.reviewerNotes || '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                          req.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          req.status === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {req.status === 'PENDING' ? 'AWAITING HR REVIEW' : req.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* REQUEST PROFILE UPDATE MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-[#714B67]" />
                <h3 className="font-bold text-sm text-[#2C3E50]">Request Profile Information Update</h3>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitRequest} className="p-6 space-y-5 text-xs">
              <div className="p-3 bg-purple-50/60 rounded border border-purple-100 text-[#714B67] text-[11px] leading-relaxed flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-[#714B67] mt-0.5" />
                <span>
                  Changes submitted here will be sent directly to the HR Manager's approval dashboard. Upon approval, your employee record, user account, and payroll routing will be automatically updated.
                </span>
              </div>

              {/* Section 1: Personal & Contact Information */}
              <div className="space-y-3">
                <h4 className="font-bold text-[#714B67] uppercase tracking-wider text-[11px] pb-1 border-b border-slate-100 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>Personal & Contact Information</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="e.g., Rahul Sharma"
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Official / Work Email *</label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="rahul@peoplepay360.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Contact Phone Number</label>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>
              </div>

              {/* Section 2: Banking & Statutory Details */}
              <div className="space-y-3">
                <h4 className="font-bold text-[#00A09D] uppercase tracking-wider text-[11px] pb-1 border-b border-slate-100 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>Banking & Statutory Details</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={form.bankName}
                      onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                      placeholder="e.g., HDFC Bank / ICICI Bank"
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#00A09D]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Bank Account Number</label>
                    <input
                      type="text"
                      value={form.bankAccountNumber}
                      onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })}
                      placeholder="e.g., 50100234567890"
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-mono focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#00A09D]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Bank IFSC Code</label>
                    <input
                      type="text"
                      value={form.bankIfscCode}
                      onChange={(e) => setForm({ ...form, bankIfscCode: e.target.value.toUpperCase() })}
                      placeholder="HDFC0001234"
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-mono uppercase focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#00A09D]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Income Tax PAN Number</label>
                    <input
                      type="text"
                      value={form.panNumber}
                      onChange={(e) => setForm({ ...form, panNumber: e.target.value.toUpperCase() })}
                      placeholder="ABCDE1234F"
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs font-mono uppercase focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#00A09D]"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Reason / Justification */}
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Reason / Justification for Update *</label>
                <textarea
                  required
                  rows={2}
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="e.g., Updated salary account to HDFC Bank and verified contact number"
                  className="w-full bg-slate-50 border border-slate-200 rounded p-2.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn-outline text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Submitting...' : 'Submit to HR for Approval'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
