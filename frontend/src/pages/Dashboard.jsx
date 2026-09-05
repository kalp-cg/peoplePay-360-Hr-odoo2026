import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, 
  LineChart, Line, PieChart, Pie, Cell 
} from 'recharts';
import { 
  DollarSign, FileCheck, Users, CalendarCheck, CheckCircle2, 
  AlertTriangle, Filter, RefreshCw, ArrowUpRight,
  Clock, Plane, FileText, Download, Check, ShieldCheck, ChevronRight,
  AlertCircle, Copy, X
} from 'lucide-react';
import api from '../api/client';
import ControlPanel from '../components/ControlPanel';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const isEmployee = user?.role === 'EMPLOYEE';

  // Executive Dashboard State
  const [data, setData] = useState(null);
  const [recentPayruns, setRecentPayruns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    departmentId: '',
    employeeType: '',
    period: '2026-09',
  });

  // Employee Self-Service State
  const [employeeData, setEmployeeData] = useState(null);
  const [empAttendance, setEmpAttendance] = useState([]);
  const [empAllocations, setEmpAllocations] = useState([]);
  const [empPayslips, setEmpPayslips] = useState([]);
  const [attStatus, setAttStatus] = useState({ checkedIn: false, elapsedHours: 0, loading: false });
  const [errorInfo, setErrorInfo] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isEmployee) {
      fetchEmployeeDashboard();
    } else {
      fetchDashboard();
    }
  }, [filters, isEmployee, user]);

  async function fetchDashboard() {
    setLoading(true);
    try {
      const [res, prRes] = await Promise.all([
        api.get('/dashboard', { params: filters }),
        api.get('/payruns'),
      ]);
      setData(res.data);
      setRecentPayruns(prRes.data.slice(0, 5));
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchEmployeeDashboard() {
    setLoading(true);
    try {
      const [empRes, attRes, allocRes, slipRes, statusRes] = await Promise.all([
        api.get('/employees'),
        api.get('/attendance'),
        api.get('/time-off/allocations'),
        api.get('/payslips'),
        api.get('/attendance/current-status'),
      ]);

      const self = empRes.data.find((e) => e.id === user?.employeeId) || empRes.data[0];
      if (self) {
        const fullDetail = await api.get(`/employees/${self.id}`);
        setEmployeeData(fullDetail.data);
      }
      setEmpAttendance(attRes.data.slice(0, 5));
      setEmpAllocations(allocRes.data);
      setEmpPayslips(slipRes.data);
      if (statusRes.data) {
        setAttStatus({
          checkedIn: statusRes.data.checkedIn,
          elapsedHours: statusRes.data.elapsedHours,
          loading: false,
        });
      }
    } catch (err) {
      console.error('Failed to load employee self-service data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleAttendance() {
    setAttStatus((prev) => ({ ...prev, loading: true }));
    console.log('[Dashboard Attendance Toggle] Triggering toggle for:', {
      user: user?.email,
      role: user?.role,
      employeeId: user?.employeeId,
      statusBefore: attStatus,
    });

    try {
      const res = await api.post('/attendance/quick-toggle');
      console.log('[Dashboard Attendance Toggle Success]:', res);
      await fetchEmployeeDashboard();
    } catch (err) {
      console.error('[Dashboard Attendance Toggle Error]:', err);
      setErrorInfo({
        action: 'Employee Dashboard Attendance Toggle',
        message: err.message || 'Failed to toggle attendance status.',
        user: { name: user?.name, email: user?.email, role: user?.role, employeeId: user?.employeeId },
        timestamp: new Date().toISOString(),
        url: window.location.href,
        stack: err.stack || err.toString(),
      });
    } finally {
      setAttStatus((prev) => ({ ...prev, loading: false }));
    }
  }

  function handleCopyError() {
    if (!errorInfo) return;
    navigator.clipboard.writeText(JSON.stringify(errorInfo, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function downloadPayslipPdf(payslipId, payslipNum) {
    try {
      const res = await api.get(`/payslips/${payslipId}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${payslipNum || 'Payslip'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.message || 'Failed to download PDF');
    }
  }

  // =========================================================================
  // VIEW A: EMPLOYEE SELF-SERVICE DASHBOARD
  // =========================================================================
  if (isEmployee) {
    const activeContract = employeeData?.contracts?.find((c) => c.status === 'ACTIVE');
    const wage = activeContract ? activeContract.wage : 50000;
    const leaveBalance = employeeData?.smartButtons?.timeOffRemainingDays ?? 20;
    const attHealth = employeeData?.smartButtons?.attendanceHealthPercent ?? 96;
    const lastPayslip = empPayslips[0];

    return (
      <div className="min-h-screen bg-[#F8F9FA] pb-12">
        <ControlPanel
          title="Employee Self-Service Portal"
          subtitle={`Welcome back, ${user?.name || 'Rahul Sharma'} • ${employeeData?.jobPosition?.title || 'Senior Software Engineer'}`}
          breadcrumbs={[{ label: 'Dashboard' }, { label: 'My Self-Service Portal' }]}
          actions={
            <button
              onClick={fetchEmployeeDashboard}
              className="btn-outline text-xs flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          }
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
          
          {/* Quick Clock-in Banner */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#714B67] text-white flex items-center justify-center font-bold text-lg shadow-sm">
                {(user?.name || 'RS').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 className="text-base font-bold text-[#2C3E50]">{user?.name || 'Rahul Sharma'}</h2>
                <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                  <span>ID: <strong className="text-slate-700">{employeeData?.employeeId || 'EMP001'}</strong></span>
                  <span>•</span>
                  <span>{employeeData?.department?.name || 'Engineering'}</span>
                  <span>•</span>
                  <span className="font-mono text-[#00A09D] font-semibold">{attStatus.checkedIn ? '● Checked In' : '○ Out of Office'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleToggleAttendance}
                disabled={attStatus.loading}
                className={`px-4 py-2.5 rounded text-xs font-semibold shadow-sm transition-all flex items-center gap-2 ${
                  attStatus.checkedIn
                    ? 'bg-[#714B67] hover:bg-[#5d3d54] text-white'
                    : 'bg-[#00A09D] hover:bg-[#008b88] text-white'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>{attStatus.loading ? 'Updating...' : (attStatus.checkedIn ? 'Check Out for Today' : 'Check In for Today')}</span>
              </button>
              {attStatus.checkedIn && (
                <span className="text-xs font-mono text-slate-600 bg-slate-100 px-3 py-2 rounded border border-slate-200">
                  {attStatus.elapsedHours} hrs elapsed
                </span>
              )}
            </div>
          </div>

          {/* 4 Personal KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Monthly Contract Wage */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Contract Monthly Wage</span>
                <span className="p-1.5 rounded bg-[#714B67]/10 text-[#714B67]">
                  <DollarSign className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-extrabold text-[#2C3E50] mt-2 font-mono">
                ₹{wage.toLocaleString()}
              </div>
              <div className="text-[11px] text-[#00A09D] mt-1 flex items-center gap-1">
                <Check className="w-3 h-3" />
                <span>Period-Valid Active Contract</span>
              </div>
            </div>

            {/* Attendance Health */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Attendance Health</span>
                <span className="p-1.5 rounded bg-[#00A09D]/10 text-[#00A09D]">
                  <Clock className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-extrabold text-[#00A09D] mt-2 font-mono">
                {attHealth}%
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                On-time ratio minus meal breaks
              </div>
            </div>

            {/* Time Off Balance */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Remaining Paid Leaves</span>
                <span className="p-1.5 rounded bg-slate-100 text-[#2C3E50]">
                  <Plane className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-extrabold text-[#2C3E50] mt-2 font-mono">
                {leaveBalance} Days
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Allocated across Paid &amp; Sick leaves
              </div>
            </div>

            {/* Last Paid Payslip */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                <span>Last Disbursed Net Salary</span>
                <span className="p-1.5 rounded bg-[#00A09D]/10 text-[#00A09D]">
                  <FileCheck className="w-4 h-4" />
                </span>
              </div>
              <div className="text-2xl font-extrabold text-[#00A09D] mt-2 font-mono">
                ₹{(lastPayslip?.netSalary || 43900).toLocaleString()}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Status: <strong className="text-[#00A09D]">PAID</strong> (August/Sept 2026)
              </div>
            </div>

          </div>

          {/* Middle Section: Transparent Salary Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Deterministic Salary Breakdown */}
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
              <div className="pb-3 border-b border-slate-100 mb-4">
                <h3 className="text-sm font-bold text-[#2C3E50] flex items-center gap-2">
                  <span>Deterministic Salary Computation Breakdown</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Calculated sequentially via mathematical rules based on your ₹{wage.toLocaleString()} base wage
                </p>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-100 font-mono">
                  <span className="text-slate-600">1. Basic Salary (60% of Wage)</span>
                  <span className="font-bold text-slate-900">₹{(wage * 0.60).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-100 font-mono">
                  <span className="text-slate-600">2. House Rent Allowance (20% of Basic)</span>
                  <span className="font-bold text-slate-900">₹{(wage * 0.60 * 0.20).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-100 font-mono">
                  <span className="text-slate-600">3. Special Allowance (Wage - Basic - HRA)</span>
                  <span className="font-bold text-slate-900">₹{(wage - (wage * 0.60) - (wage * 0.60 * 0.20)).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded bg-slate-100 border border-slate-200 font-mono">
                  <span className="font-semibold text-[#2C3E50]">4. Total Gross Earnings</span>
                  <span className="font-bold text-[#2C3E50]">₹{wage.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-200 font-mono">
                  <span className="text-slate-700">5. Provident Fund Deduction (12% of Basic)</span>
                  <span className="font-bold text-slate-700">- ₹{(wage * 0.60 * 0.12).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded bg-slate-50 border border-slate-200 font-mono">
                  <span className="text-slate-700">6. Income Tax / TDS (5% of Gross)</span>
                  <span className="font-bold text-slate-700">- ₹{(wage * 0.05).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded bg-teal-50 border border-[#00A09D]/30 font-mono">
                  <span className="font-bold text-[#00A09D] text-sm">7. Net Take-Home Salary</span>
                  <span className="font-bold text-[#00A09D] text-base">
                    ₹{(wage - (wage * 0.60 * 0.12) - (wage * 0.05)).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Validated Payslips */}
            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                  <h3 className="text-sm font-bold text-[#2C3E50]">My Validated Payslips</h3>
                  <span className="text-xs text-slate-500 font-mono">{empPayslips.length} Available</span>
                </div>

                <div className="space-y-3">
                  {empPayslips.length === 0 ? (
                    <div className="text-center py-8 text-xs text-slate-400">
                      No payslips generated yet for current period.
                    </div>
                  ) : (
                    empPayslips.map((slip) => (
                      <div key={slip.id} className="p-3 rounded-lg border border-slate-200 hover:border-[#714B67] transition-all bg-slate-50/50 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-slate-800">{slip.payslipNumber}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Period: {new Date(slip.payrun?.periodStart || '2026-09-01').toLocaleDateString()}
                          </div>
                          <div className="text-[11px] font-mono font-semibold text-emerald-700 mt-1">
                            Net: ₹{slip.netSalary?.toLocaleString()}
                          </div>
                        </div>

                        <button
                          onClick={() => downloadPayslipPdf(slip.id, slip.payslipNumber)}
                          className="btn-outline text-xs px-2.5 py-1.5 flex items-center gap-1.5 hover:bg-slate-100"
                          title="Download Printable PDF"
                        >
                          <Download className="w-3.5 h-3.5 text-[#714B67]" />
                          <span>PDF</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Statutory Compliant</span>
                <span className="flex items-center gap-1 text-emerald-700 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Digitally Certified</span>
                </span>
              </div>
            </div>

          </div>

          {/* Recent Attendance Records */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-semibold text-slate-800 text-sm">My Recent Attendance Activity</h3>
              <span className="text-xs text-slate-500">Break hours automatically deducted</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Check In</th>
                    <th className="px-4 py-3">Check Out</th>
                    <th className="px-4 py-3">Break</th>
                    <th className="px-4 py-3 font-mono">Worked Hours</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {empAttendance.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-6 text-slate-400">
                        No recent attendance entries recorded.
                      </td>
                    </tr>
                  ) : (
                    empAttendance.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium font-mono">{new Date(a.date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 font-mono">{a.checkIn ? new Date(a.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                        <td className="px-4 py-3 font-mono">{a.checkOut ? new Date(a.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                        <td className="px-4 py-3">{a.breakHours}h</td>
                        <td className="px-4 py-3 font-bold font-mono text-teal-700">{a.workedHours} hrs</td>
                        <td className="px-4 py-3 text-right">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {a.status}
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

        {/* Error Diagnostics Modal with 1-Click Copy Details */}
        {errorInfo && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-in fade-in">
            <div className="bg-white text-slate-900 border border-slate-200 rounded-lg shadow-2xl max-w-lg w-full overflow-hidden">
              <div className="p-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                  <h3 className="font-bold text-sm text-rose-900">Attendance Action Notice</h3>
                </div>
                <button onClick={() => setErrorInfo(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-rose-100">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4 text-xs">
                <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-800">
                  <strong>Error:</strong> {errorInfo.message}
                </div>

                <div>
                  <span className="text-[11px] font-semibold uppercase text-slate-500 block mb-1.5">
                    Technical Diagnostics (Click below to copy &amp; send):
                  </span>
                  <div className="bg-slate-900 text-slate-100 p-3 rounded font-mono text-[11px] overflow-x-auto max-h-40 leading-relaxed select-all">
                    <pre>{JSON.stringify(errorInfo, null, 2)}</pre>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                  <span className="text-[11px] text-slate-500">
                    {copied ? '✓ Copied to clipboard! Ready to paste.' : 'Click to copy error payload'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setErrorInfo(null)} className="btn-outline text-xs px-3 py-1.5">
                      Dismiss
                    </button>
                    <button onClick={handleCopyError} className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5 shadow-sm">
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copied ? 'Copied!' : 'Copy Error Details'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // VIEW B: EXECUTIVE OPERATIONS DASHBOARD (Admin, HR, Payroll)
  // =========================================================================
  const kpis = data?.kpis || {
    totalNetSalaryPaid: 0,
    payslipsGenerated: 0,
    averageSalary: 0,
    approvedTimeOffDays: 0,
    attendanceHealthPercent: 100,
  };

  const charts = data?.charts || {
    departmentSalaryCost: [],
    monthlySalaryTrends: [],
    attendanceDistribution: [],
    leaveOverview: {},
  };

  const COLORS = ['#714B67', '#00A09D', '#2C3E50', '#8A637F', '#007A78', '#4A627A'];

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-12">
      <ControlPanel
        title="Payroll & HR Operations Dashboard"
        subtitle="Live PostgreSQL Real-Time Aggregations & Analytics"
        breadcrumbs={[{ label: 'Dashboard' }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchDashboard}
              className="btn-outline text-xs flex items-center gap-1.5"
              title="Refresh Real-Time Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* Global Filter Bar */}
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            <Filter className="w-4 h-4 text-[#714B67]" />
            <span>Dashboard Filters:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500">Period:</span>
              <select
                value={filters.period}
                onChange={(e) => setFilters({ ...filters, period: e.target.value })}
                className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#714B67]"
              >
                <option value="2026-09">September 2026</option>
                <option value="2026-08">August 2026</option>
                <option value="">All Time</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500">Employment:</span>
              <select
                value={filters.employeeType}
                onChange={(e) => setFilters({ ...filters, employeeType: e.target.value })}
                className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#714B67]"
              >
                <option value="">All Types</option>
                <option value="FULL_TIME">Full-time</option>
                <option value="PART_TIME">Part-time</option>
                <option value="CONTRACT">Contract</option>
              </select>
            </div>
          </div>
        </div>

        {/* 5 KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Total Disbursed Net</span>
              <span className="p-1.5 rounded bg-[#714B67]/10 text-[#714B67]">
                <DollarSign className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-extrabold text-[#2C3E50] mt-2 font-mono">
              ₹{(kpis.totalNetSalaryPaid || 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Paid payruns</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Total Payslips</span>
              <span className="p-1.5 rounded bg-[#00A09D]/10 text-[#00A09D]">
                <FileCheck className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-extrabold text-[#00A09D] mt-2 font-mono">
              {kpis.payslipsGenerated}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Processed slips</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Average Net Salary</span>
              <span className="p-1.5 rounded bg-slate-100 text-[#2C3E50]">
                <Users className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-extrabold text-[#2C3E50] mt-2 font-mono">
              ₹{(kpis.averageSalary || 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Per active employee</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Approved Time Off</span>
              <span className="p-1.5 rounded bg-[#714B67]/10 text-[#714B67]">
                <CalendarCheck className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-extrabold text-[#714B67] mt-2 font-mono">
              {kpis.approvedTimeOffDays} d
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Leave days taken</div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Attendance Health</span>
              <span className="p-1.5 rounded bg-[#00A09D]/10 text-[#00A09D]">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-extrabold text-[#00A09D] mt-2 font-mono">
              {kpis.attendanceHealthPercent}%
            </div>
            <div className="text-[11px] text-slate-400 mt-1">On-time ratio</div>
          </div>

        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-bold text-[#2C3E50] mb-1">
              Department Salary Cost Distribution
            </h3>
            <p className="text-xs text-slate-500 mb-4">Total net salary cost grouped by operating department</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.departmentSalaryCost}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="department" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(val) => `₹${val / 1000}k`} />
                  <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Total Cost']} />
                  <Bar dataKey="totalCost" fill="#714B67" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-bold text-[#2C3E50] mb-1">
              Attendance Distribution
            </h3>
            <p className="text-xs text-slate-500 mb-4">Record status breakdown (Present, Late, Overtime)</p>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.attendanceDistribution}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {charts.attendanceDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Recent Payrun Batches Execution Summary */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="font-semibold text-slate-800 text-sm">Recent Payrun Execution Batches</h3>
              <p className="text-xs text-slate-500 mt-0.5">Summary of recent batch payroll computations and disbursements</p>
            </div>
            <a
              href="/payroll"
              className="text-xs font-semibold text-[#714B67] hover:underline flex items-center gap-1"
            >
              <span>Manage in Payroll</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="px-5 py-3">Payrun Batch</th>
                  <th className="px-5 py-3">Salary Structure</th>
                  <th className="px-5 py-3">Period</th>
                  <th className="px-5 py-3 font-mono">Gross Total</th>
                  <th className="px-5 py-3 font-mono">Net Disbursed</th>
                  <th className="px-5 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {recentPayruns.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-slate-400">
                      No recent payruns processed.
                    </td>
                  </tr>
                ) : (
                  recentPayruns.map((pr) => (
                    <tr key={pr.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3 font-semibold text-[#714B67]">{pr.name}</td>
                      <td className="px-5 py-3 text-slate-600">{pr.salaryStructure?.name || 'Standard Monthly Structure'}</td>
                      <td className="px-5 py-3 text-slate-500 font-mono">
                        {new Date(pr.periodStart).toLocaleDateString()} - {new Date(pr.periodEnd).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-3 font-mono text-slate-700 font-medium">₹{pr.totalGross?.toLocaleString() || 0}</td>
                      <td className="px-5 py-3 font-mono text-[#00A09D] font-bold">₹{pr.totalNet?.toLocaleString() || 0}</td>
                      <td className="px-5 py-3 text-right">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          pr.status === 'PAID'
                            ? 'bg-teal-50 text-[#00A09D] border-[#00A09D]/30'
                            : pr.status === 'VALIDATED'
                            ? 'bg-purple-50 text-[#714B67] border-[#714B67]/30'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                        }`}>
                          {pr.status}
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
    </div>
  );
}
