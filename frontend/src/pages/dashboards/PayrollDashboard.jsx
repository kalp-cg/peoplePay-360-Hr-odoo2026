import React, { useState, useEffect } from 'react';
import { 
  DollarSign, FileCheck, FileText, CheckCircle2, AlertTriangle, AlertCircle,
  RefreshCw, ArrowUpRight, Plus, Calculator, ChevronRight, ShieldCheck 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, 
  LineChart, Line 
} from 'recharts';
import { Link } from 'react-router-dom';
import { formatPeriodRange } from '../../utils/formatters';
import api from '../../api/client';
import ControlPanel from '../../components/ControlPanel';
import { useAuth } from '../../context/AuthContext';

export default function PayrollDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [recentPayruns, setRecentPayruns] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('2026-08');
  const [employeeType, setEmployeeType] = useState('ALL');
  const [departmentId, setDepartmentId] = useState('');

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchPayrollDashboard();
  }, [period, employeeType, departmentId]);

  async function fetchDepartments() {
    try {
      const res = await api.get('/departments');
      setDepartments(Array.isArray(res) ? res : (res.data || []));
    } catch (err) {
      console.warn('Failed to load departments:', err);
    }
  }

  async function fetchPayrollDashboard() {
    setLoading(true);
    try {
      const params = { period };
      if (employeeType && employeeType !== 'ALL') params.employeeType = employeeType;
      if (departmentId) params.departmentId = departmentId;

      const [dashRes, prRes] = await Promise.all([
        api.get('/dashboard', { params }),
        api.get('/payruns'),
      ]);
      setData(dashRes?.data || dashRes);
      setRecentPayruns(Array.isArray(prRes) ? prRes : (prRes?.data || []));
    } catch (err) {
      console.error('Failed to load payroll dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  const kpis = data?.kpis || {
    totalNetSalaryPaid: 0,
    payslipsGenerated: 0,
    averageSalary: 0,
    attendanceHealthPercent: 100,
    approvedTimeOffDays: 0,
  };

  const charts = data?.charts || {
    departmentSalaryCost: [],
    monthlySalaryTrends: [],
  };

  const alerts = data?.alerts || {
    activePayrollWarnings: [],
    missingBankDetails: [],
    expiringContracts: [],
  };

  const attendanceOverview = data?.attendanceOverview || {
    present: 0,
    late: 0,
    absent: 0,
    overtime: 0,
    missingCheckOuts: 0,
    manualEdits: 0,
    attendanceCoveragePercent: 100,
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-12">
      <ControlPanel
        title="Payroll & Compensation Control"
        subtitle={`Welcome, ${user?.name || 'Payroll Specialist'} • Deterministic Payroll Engine & Disbursals`}
        breadcrumbs={[{ label: 'Dashboard' }, { label: 'Payroll Operations' }]}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={fetchPayrollDashboard}
              className="btn-outline text-xs flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <Link to="/payroll" className="btn-primary text-xs flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              <span>Manage Payruns</span>
            </Link>
          </div>
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* Payroll Execution Workflow Ribbon */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded bg-[#714B67]/10 text-[#714B67]">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#2C3E50] uppercase tracking-wider">Payroll Processing Pipeline</h3>
              <p className="text-xs text-slate-500">Deterministic Mathematical Salary Computation Rules</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <span className="px-2.5 py-1 bg-slate-100 rounded border border-slate-200 text-slate-700">1. Attendance Closes</span>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span className="px-2.5 py-1 bg-purple-50 text-[#714B67] font-bold rounded border border-[#714B67]/30">2. Compute Payrun</span>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span className="px-2.5 py-1 bg-teal-50 text-[#00A09D] font-bold rounded border border-[#00A09D]/30">3. Bank Disbursal</span>
          </div>
        </div>

        {/* Dashboard Filter Bar with Period, Department, and Employment Type */}
        <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-semibold text-slate-700">
            <svg className="w-4 h-4 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
            <span>Live Analysis Filters:</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Period:</span>
              <select 
                value={period} 
                onChange={(e) => setPeriod(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded px-3 py-1 font-semibold text-slate-800 focus:bg-white focus:outline-none cursor-pointer"
              >
                <option value="2026-08">August 2026 (Latest Disbursed)</option>
                <option value="ALL">All Periods (Year to Date)</option>
                <option value="2026-09">September 2026 (Active Run)</option>
                <option value="2026-07">July 2026</option>
                <option value="2026-06">June 2026</option>
                <option value="2026-05">May 2026</option>
                <option value="2026-04">April 2026</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Department:</span>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded px-3 py-1 font-semibold text-slate-800 focus:bg-white focus:outline-none"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Employment:</span>
              <select
                value={employeeType}
                onChange={(e) => setEmployeeType(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded px-3 py-1 font-semibold text-slate-800 focus:bg-white focus:outline-none"
              >
                <option value="ALL">All Types</option>
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="CONTRACTOR">Contractor</option>
                <option value="INTERN">Intern</option>
              </select>
            </div>
          </div>
        </div>

        {/* 5 Core Metric KPI Cards - Live PostgreSQL Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          
          {/* 1. Total Disbursed Net */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Total Disbursed Net</span>
              <span className="w-7 h-7 rounded-md bg-purple-50 text-[#714B67] border border-purple-100 flex items-center justify-center font-bold">
                ₹
              </span>
            </div>
            <div className="text-xl font-extrabold text-slate-900 mt-2 font-mono tracking-tight">
              ₹{Number(kpis.totalNetSalaryPaid ?? 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium">
              Paid payruns
            </div>
          </div>

          {/* 2. Total Payslips */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Total Payslips</span>
              <span className="w-7 h-7 rounded-md bg-teal-50 text-[#00A09D] border border-teal-100 flex items-center justify-center">
                <FileCheck className="w-4 h-4" />
              </span>
            </div>
            <div className="text-xl font-extrabold text-[#00A09D] mt-2 font-mono">
              {kpis.payslipsGenerated ?? 0}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium">
              Processed slips
            </div>
          </div>

          {/* 3. Average Net Salary */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Average Net Salary</span>
              <span className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                <Calculator className="w-4 h-4" />
              </span>
            </div>
            <div className="text-xl font-extrabold text-slate-900 mt-2 font-mono tracking-tight">
              ₹{Number(kpis.averageSalary ?? 0).toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium">
              Per active employee
            </div>
          </div>

          {/* 4. Approved Time Off */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Approved Time Off</span>
              <span className="w-7 h-7 rounded-md bg-purple-50 text-[#714B67] border border-purple-100 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </span>
            </div>
            <div className="text-xl font-extrabold text-slate-900 mt-2 font-mono">
              {kpis.approvedTimeOffDays ?? 0} d
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium">
              Leave days taken
            </div>
          </div>

          {/* 5. Attendance Health */}
          <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Attendance Health</span>
              <span className="w-7 h-7 rounded-md bg-teal-50 text-[#00A09D] border border-teal-100 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>
            <div className="text-xl font-extrabold text-[#00A09D] mt-2 font-mono">
              {kpis.attendanceHealthPercent ?? 100}%
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-medium">
              On-time ratio
            </div>
          </div>

        </div>

        {/* Operational Alerts & Attendance Health Breakdown (Requirement B9) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Operational Alerts */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-bold text-[#2C3E50] uppercase tracking-wider">Payroll & Contract Operational Alerts</h3>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-amber-50 text-amber-700 border border-amber-200">
                {(alerts.activePayrollWarnings?.length || 0) + (alerts.missingBankDetails?.length || 0) + (alerts.expiringContracts?.length || 0)} Items
              </span>
            </div>

            <div className="space-y-2 text-xs">
              {alerts.activePayrollWarnings?.length === 0 && alerts.missingBankDetails?.length === 0 && alerts.expiringContracts?.length === 0 ? (
                <div className="text-center py-5 text-slate-400 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  <span>No operational alerts or pending payroll issues detected.</span>
                </div>
              ) : (
                <>
                  {alerts.activePayrollWarnings?.map((w) => (
                    <div key={w.id} className="p-2.5 rounded bg-rose-50/70 border border-rose-200 text-rose-900 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold font-mono text-[11px] text-rose-700">[{w.type}]</span>{' '}
                        <span>{w.message}</span>
                      </div>
                    </div>
                  ))}
                  {alerts.missingBankDetails?.map((emp) => (
                    <div key={emp.id} className="p-2 rounded bg-amber-50/60 border border-amber-200 text-amber-900 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span><strong>{emp.name}</strong> ({emp.employeeId}) missing bank/IFSC details</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-medium">{emp.department}</span>
                    </div>
                  ))}
                  {alerts.expiringContracts?.map((c) => (
                    <div key={c.id} className="p-2 rounded bg-purple-50/50 border border-purple-200 text-purple-900 flex items-center justify-between">
                      <span>Contract expiring for <strong>{c.employeeName}</strong></span>
                      <span className="font-mono text-[11px] text-purple-700 font-semibold">
                        {c.endDate ? new Date(c.endDate).toLocaleDateString() : 'Active'}
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* Attendance Breakdown Card */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#00A09D]" />
                <h3 className="text-xs font-bold text-[#2C3E50] uppercase tracking-wider">Attendance Quality & Exceptions</h3>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                Coverage: {attendanceOverview.attendanceCoveragePercent}%
              </span>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
              <div className="p-2 bg-slate-50 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px]">Present</span>
                <span className="font-bold text-teal-700 text-sm font-mono">{attendanceOverview.present}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px]">Late</span>
                <span className="font-bold text-purple-700 text-sm font-mono">{attendanceOverview.late}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px]">Overtime</span>
                <span className="font-bold text-slate-800 text-sm font-mono">{attendanceOverview.overtime}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px]">Absent</span>
                <span className="font-bold text-rose-700 text-sm font-mono">{attendanceOverview.absent}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px]">No Check-out</span>
                <span className="font-bold text-amber-700 text-sm font-mono">{attendanceOverview.missingCheckOuts}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded border border-slate-100">
                <span className="text-slate-400 block text-[10px]">Manual Edits</span>
                <span className="font-bold text-indigo-700 text-sm font-mono">{attendanceOverview.manualEdits}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Charts: Department Payroll Cost & Monthly Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-bold text-[#2C3E50] mb-4">Departmental Salary Expenditure</h3>
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

          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
            <h3 className="text-sm font-bold text-[#2C3E50] mb-4">Monthly Payroll Trends</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={charts.monthlySalaryTrends}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString()}`, 'Net Paid']} />
                  <Line type="monotone" dataKey="netPaid" stroke="#00A09D" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Payruns Table */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-semibold text-slate-800 text-sm">Recent Payrun Batches</h3>
            <Link to="/payroll" className="text-xs text-[#714B67] hover:underline flex items-center gap-1 font-semibold">
              <span>View All Payruns</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase text-[11px]">
                <tr>
                  <th className="px-4 py-3">Payrun Name</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Total Net Disbursed</th>
                  <th className="px-4 py-3">Payslips Count</th>
                  <th className="px-4 py-3 text-right">Batch Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {recentPayruns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-6 text-slate-400">
                      No payruns found.
                    </td>
                  </tr>
                ) : (
                  recentPayruns.map((pr) => (
                    <tr key={pr.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-900">{pr.name}</td>
                      <td className="px-4 py-3 font-mono text-[11px]">{formatPeriodRange(pr.periodStart, pr.periodEnd)}</td>
                      <td className="px-4 py-3 font-mono font-bold text-teal-700">₹{Number(pr.totalNet || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 font-mono">{pr._count?.payslips ?? pr.payslips?.length ?? 0}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          pr.status === 'PAID' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          pr.status === 'VALIDATED' ? 'bg-teal-50 text-[#00A09D] border border-teal-200' :
                          pr.status === 'COMPUTED' ? 'bg-purple-50 text-[#714B67] border border-purple-200' :
                          'bg-slate-100 text-slate-700 border border-slate-200'
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
