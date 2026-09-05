import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, FileText, Clock, Plane, DollarSign, 
  Mail, Phone, Building, Briefcase, Calendar, CheckCircle, 
  ChevronRight, ArrowLeft, Edit, Save, X 
} from 'lucide-react';
import api from '../api/client';
import ControlPanel from '../components/ControlPanel';
import { useAuth } from '../context/AuthContext';

export default function Employees() {
  const { user } = useAuth();
  const isEmployee = user?.role === 'EMPLOYEE';
  const canManageEmployees = ['ADMIN', 'HR_MANAGER'].includes(user?.role);

  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'list'
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [schedules, setSchedules] = useState([]);

  // Create Modal
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: '',
    name: '',
    email: '',
    phone: '',
    departmentId: '',
    jobPositionId: '',
    joiningDate: new Date().toISOString().slice(0, 10),
    employeeType: 'FULL_TIME',
    workingScheduleId: '',
    bankAccountNumber: '',
    bankName: '',
    bankIfscCode: '',
    panNumber: '',
  });

  // Active Tab on Form View
  const [activeTab, setActiveTab] = useState('work'); // 'work' | 'private'

  useEffect(() => {
    fetchEmployees();
    fetchMetadata();
  }, []);

  async function fetchEmployees() {
    setLoading(true);
    try {
      const res = await api.get('/employees');
      setEmployees(res.data);
      if (isEmployee && res.data.length > 0) {
        // Automatically load employee's own full profile
        const self = res.data.find(e => e.id === user.employeeId) || res.data[0];
        if (self) {
          handleSelectEmployee(self);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMetadata() {
    try {
      const [deptRes, schedRes] = await Promise.all([
        api.get('/departments'),
        api.get('/schedules'),
      ]);
      setDepartments(deptRes.data);
      setSchedules(schedRes.data);
      if (deptRes.data.length > 0) {
        fetchPositions(deptRes.data[0].id);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchPositions(deptId) {
    try {
      const res = await api.get(`/departments/positions?departmentId=${deptId}`);
      setPositions(res.data);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSelectEmployee(emp) {
    try {
      const res = await api.get(`/employees/${emp.id}`);
      setSelectedEmployee(res.data);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCreateEmployee(e) {
    e.preventDefault();
    try {
      await api.post('/employees', formData);
      setShowModal(false);
      setFormData({
        employeeId: '',
        name: '',
        email: '',
        phone: '',
        departmentId: '',
        jobPositionId: '',
        joiningDate: new Date().toISOString().slice(0, 10),
        employeeType: 'FULL_TIME',
        workingScheduleId: '',
        bankAccountNumber: '',
        bankName: '',
        bankIfscCode: '',
        panNumber: '',
      });
      fetchEmployees();
    } catch (err) {
      alert(err.message || 'Failed to create employee');
    }
  }

  const filteredEmployees = employees.filter((emp) => {
    const q = search.toLowerCase();
    return (
      emp.name.toLowerCase().includes(q) ||
      emp.employeeId.toLowerCase().includes(q) ||
      emp.department?.name.toLowerCase().includes(q) ||
      emp.jobPosition?.title.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-12">
      {/* Control Panel */}
      <ControlPanel
        title={isEmployee ? "My Profile" : (selectedEmployee ? selectedEmployee.name : "Employees")}
        subtitle={isEmployee ? `${selectedEmployee?.employeeId || ''} • ${selectedEmployee?.jobPosition?.title || ''}` : (selectedEmployee ? `${selectedEmployee.employeeId} • ${selectedEmployee.jobPosition?.title || ''}` : "Central Employee Management Hub")}
        breadcrumbs={
          isEmployee
            ? [{ label: 'My Profile' }]
            : (selectedEmployee 
                ? [{ label: 'Employees', link: '#' }, { label: selectedEmployee.name }]
                : [{ label: 'Employees' }])
        }
        actions={
          isEmployee ? null : (
            selectedEmployee ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="btn-outline text-xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to List</span>
                </button>
              </div>
            ) : (
              canManageEmployees && (
                <button
                  onClick={() => setShowModal(true)}
                  className="btn-primary text-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Employee</span>
                </button>
              )
            )
          )
        }
        searchQuery={!selectedEmployee && !isEmployee ? search : null}
        onSearchChange={!selectedEmployee && !isEmployee ? setSearch : null}
        viewMode={!selectedEmployee && !isEmployee ? viewMode : null}
        onViewModeChange={!selectedEmployee && !isEmployee ? setViewMode : null}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">

        {/* -------------------- VIEW 1: EMPLOYEE DETAIL FORM -------------------- */}
        {selectedEmployee ? (
          <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
            
            {/* Header with Odoo Smart Buttons */}
            <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-[#714B67] text-white flex items-center justify-center font-bold text-xl shadow-sm">
                  {selectedEmployee.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-[#2C3E50]">{selectedEmployee.name}</h2>
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {selectedEmployee.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    ID: <span className="font-semibold text-slate-700">{selectedEmployee.employeeId}</span> • {selectedEmployee.jobPosition?.title} • {selectedEmployee.department?.name}
                  </p>
                </div>
              </div>

              {/* Odoo Smart Buttons Row */}
              <div className="flex flex-wrap items-center gap-2.5">
                
                {/* Contracts Smart Button */}
                <div className="odoo-smart-stat">
                  <FileText className="w-5 h-5 text-[#714B67]" />
                  <div>
                    <div className="text-[11px] font-bold text-slate-800">
                      {selectedEmployee.smartButtons?.contractsCount || 0} Contracts
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      ₹{(selectedEmployee.smartButtons?.activeWage || 0).toLocaleString()}/mo
                    </div>
                  </div>
                </div>

                {/* Attendance Smart Button */}
                <div className="odoo-smart-stat">
                  <Clock className="w-5 h-5 text-[#00A09D]" />
                  <div>
                    <div className="text-[11px] font-bold text-slate-800">
                      {selectedEmployee.smartButtons?.attendanceCount || 0} Records
                    </div>
                    <div className="text-[10px] text-emerald-600 font-medium">
                      Health: {selectedEmployee.smartButtons?.attendanceHealthPercent || 100}%
                    </div>
                  </div>
                </div>

                {/* Time Off Smart Button */}
                <div className="odoo-smart-stat">
                  <Plane className="w-5 h-5 text-amber-600" />
                  <div>
                    <div className="text-[11px] font-bold text-slate-800">
                      {selectedEmployee.smartButtons?.timeOffRemainingDays || 0}d Balance
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Remaining Days
                    </div>
                  </div>
                </div>

                {/* Payslips Smart Button */}
                <div className="odoo-smart-stat">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                  <div>
                    <div className="text-[11px] font-bold text-slate-800">
                      {selectedEmployee.smartButtons?.payslipsCount || 0} Payslips
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Generated
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Form Tabs */}
            <div className="border-b border-slate-200 px-6 flex gap-6 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('work')}
                className={`py-3 border-b-2 transition-colors ${
                  activeTab === 'work' 
                    ? 'border-[#714B67] text-[#714B67]' 
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Work Information
              </button>
              <button
                onClick={() => setActiveTab('private')}
                className={`py-3 border-b-2 transition-colors ${
                  activeTab === 'private' 
                    ? 'border-[#714B67] text-[#714B67]' 
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Private & Bank Information
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-6">
              {activeTab === 'work' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-800 uppercase tracking-wider text-[11px] text-[#714B67]">
                      Organizational Role
                    </h3>
                    <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Department:</span>
                      <span className="col-span-2 font-semibold text-slate-800">{selectedEmployee.department?.name}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Job Position:</span>
                      <span className="col-span-2 font-semibold text-slate-800">{selectedEmployee.jobPosition?.title}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Manager:</span>
                      <span className="col-span-2 font-semibold text-slate-800">{selectedEmployee.manager?.name || 'None (Head of Dept)'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Employee Type:</span>
                      <span className="col-span-2 font-semibold text-slate-800">{selectedEmployee.employeeType}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-800 uppercase tracking-wider text-[11px] text-[#714B67]">
                      Schedule & Dates
                    </h3>
                    <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Working Schedule:</span>
                      <span className="col-span-2 font-semibold text-slate-800">
                        {selectedEmployee.workingSchedule?.name || 'Standard 40-Hour Workweek'} ({selectedEmployee.workingSchedule?.weeklyHours || 40}h/wk)
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Joining Date:</span>
                      <span className="col-span-2 font-semibold text-slate-800">
                        {new Date(selectedEmployee.joiningDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Active Contract:</span>
                      <span className="col-span-2 font-mono font-bold text-teal-700">
                        ₹{(selectedEmployee.contracts?.find(c => c.status === 'ACTIVE')?.wage || 0).toLocaleString()} / month
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-800 uppercase tracking-wider text-[11px] text-[#714B67]">
                      Contact Information
                    </h3>
                    <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Work Email:</span>
                      <span className="col-span-2 font-semibold text-slate-800">{selectedEmployee.email}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Phone Number:</span>
                      <span className="col-span-2 font-semibold text-slate-800">{selectedEmployee.phone || 'N/A'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">PAN Number:</span>
                      <span className="col-span-2 font-mono font-semibold text-slate-800">{selectedEmployee.panNumber || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-semibold text-slate-800 uppercase tracking-wider text-[11px] text-[#714B67]">
                      Bank Details (For Direct Payroll Disbursement)
                    </h3>
                    <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Bank Name:</span>
                      <span className="col-span-2 font-semibold text-slate-800">{selectedEmployee.bankName || <span className="text-rose-600 font-medium">Missing Bank Details</span>}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Account Number:</span>
                      <span className="col-span-2 font-mono font-semibold text-slate-800">{selectedEmployee.bankAccountNumber || <span className="text-rose-600 font-medium">Missing Account Number</span>}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-1.5 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">IFSC Code:</span>
                      <span className="col-span-2 font-mono font-semibold text-slate-800">{selectedEmployee.bankIfscCode || <span className="text-rose-600 font-medium">Missing IFSC</span>}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        ) : (
          /* -------------------- VIEW 2: KANBAN OR LIST VIEW -------------------- */
          <div>
            {viewMode === 'kanban' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEmployees.map((emp) => (
                  <div
                    key={emp.id}
                    onClick={() => handleSelectEmployee(emp)}
                    className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm hover:border-[#714B67] hover:shadow-md cursor-pointer transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-slate-100 text-[#714B67] font-bold flex items-center justify-center border border-slate-200 text-sm">
                            {emp.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-semibold text-slate-800 text-sm hover:text-[#714B67] transition-colors">{emp.name}</h4>
                            <p className="text-xs text-slate-500">{emp.jobPosition?.title || 'Staff'}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {emp.status}
                        </span>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          <Building className="w-3.5 h-3.5 text-slate-400" />
                          <span>{emp.department?.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">{emp.email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="font-mono font-semibold text-teal-700">
                        ₹{(emp.activeWage || 0).toLocaleString()} / mo
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center gap-0.5">
                        ID: {emp.employeeId}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* List View Table */
              <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-4 py-3">Employee ID</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Position</th>
                      <th className="px-4 py-3">Active Wage</th>
                      <th className="px-4 py-3">Leaves Remaining</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredEmployees.map((emp) => (
                      <tr 
                        key={emp.id} 
                        onClick={() => handleSelectEmployee(emp)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 font-mono font-semibold text-[#714B67]">{emp.employeeId}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{emp.name}</td>
                        <td className="px-4 py-3">{emp.department?.name}</td>
                        <td className="px-4 py-3">{emp.jobPosition?.title}</td>
                        <td className="px-4 py-3 font-mono font-medium text-teal-700">₹{(emp.activeWage || 0).toLocaleString()}</td>
                        <td className="px-4 py-3">{emp.totalRemainingLeaves || 18} Days</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {emp.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* -------------------- CREATE EMPLOYEE MODAL -------------------- */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white border border-slate-200 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <h3 className="font-bold text-sm text-[#2C3E50]">Create New Employee Record</h3>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateEmployee} className="p-6 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Employee ID *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. EMP008"
                      value={formData.employeeId}
                      onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rajesh Kumar"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Work Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="rajesh@peoplepay360.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Phone Number</label>
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Department *</label>
                    <select
                      required
                      value={formData.departmentId}
                      onChange={(e) => {
                        setFormData({ ...formData, departmentId: e.target.value });
                        fetchPositions(e.target.value);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                    >
                      <option value="">Select Department</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Job Position *</label>
                    <select
                      required
                      value={formData.jobPositionId}
                      onChange={(e) => setFormData({ ...formData, jobPositionId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                    >
                      <option value="">Select Position</option>
                      {positions.map((p) => (
                        <option key={p.id} value={p.id}>{p.title}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Working Schedule</label>
                    <select
                      value={formData.workingScheduleId}
                      onChange={(e) => setFormData({ ...formData, workingScheduleId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                    >
                      <option value="">Select Schedule</option>
                      {schedules.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.weeklyHours}h/wk)</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Joining Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.joiningDate}
                      onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <h4 className="font-semibold text-slate-700 mb-2">Bank & Statutory Details</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-600 mb-1">Bank Name</label>
                      <input
                        type="text"
                        placeholder="HDFC Bank"
                        value={formData.bankName}
                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1">Account Number</label>
                      <input
                        type="text"
                        placeholder="12-digit number"
                        value={formData.bankAccountNumber}
                        onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 mb-1">IFSC Code</label>
                      <input
                        type="text"
                        placeholder="HDFC0001234"
                        value={formData.bankIfscCode}
                        onChange={(e) => setFormData({ ...formData, bankIfscCode: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn-outline text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-primary text-xs"
                  >
                    Save Employee Record
                  </button>
                </div>
              </form>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
