import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, FileText, Clock, Plane, DollarSign, 
  Mail, Phone, Building, Briefcase, Calendar, CheckCircle, 
  ChevronRight, ArrowLeft, Edit, Save, X, Trash2, Shield, 
  Download, ExternalLink, AlertCircle, AlertTriangle, 
  RefreshCw, CheckCircle2, CreditCard, Sparkles
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
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' or 'list'
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Metadata for dropdowns
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [structures, setStructures] = useState([]);

  // Active Tab in Employee Detail View
  // 'payroll' | 'work' | 'private' | 'attendance' | 'timeoff'
  const [activeTab, setActiveTab] = useState('payroll');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(null);
  const [notice, setNotice] = useState(null);

  // Form State for Create / Edit
  const initialFormState = {
    employeeId: '',
    name: '',
    email: '',
    phone: '',
    departmentId: '',
    jobPositionId: '',
    managerId: '',
    employeeType: 'FULL_TIME',
    status: 'ACTIVE',
    joiningDate: new Date().toISOString().slice(0, 10),
    workingScheduleId: '',
    bankAccountNumber: '',
    bankName: '',
    bankIfscCode: '',
    panNumber: '',
    // Integrated Contract fields (Optional on Create)
    createInitialContract: true,
    initialWage: '50000',
    salaryStructureId: '',
    contractNotes: 'Standard permanent employment contract',
  };

  const [formData, setFormData] = useState(initialFormState);

  // Contract Modal Form
  const [contractFormData, setContractFormData] = useState({
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    wage: '50000',
    salaryStructureId: '',
    notes: 'Renewed / Updated employment contract',
    status: 'ACTIVE',
  });

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
        const self = res.data.find(e => e.id === user.employeeId) || res.data[0];
        if (self) {
          handleSelectEmployee(self);
        }
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMetadata() {
    try {
      const [deptRes, schedRes, structRes] = await Promise.all([
        api.get('/departments'),
        api.get('/schedules'),
        api.get('/salary/structures'),
      ]);
      setDepartments(deptRes.data);
      setSchedules(schedRes.data);
      setStructures(structRes.data);

      if (structRes.data.length > 0) {
        setFormData(prev => ({ ...prev, salaryStructureId: String(structRes.data[0].id) }));
        setContractFormData(prev => ({ ...prev, salaryStructureId: String(structRes.data[0].id) }));
      }
    } catch (err) {
      console.error('Failed to fetch metadata:', err);
    }
  }

  async function handleSelectEmployee(emp) {
    setLoadingDetails(true);
    try {
      const res = await api.get(`/employees/${emp.id}`);
      setSelectedEmployee(res.data);
    } catch (err) {
      console.error('Failed to load employee details:', err);
    } finally {
      setLoadingDetails(false);
    }
  }

  function openCreateModal() {
    // Suggest next Employee ID
    const count = employees.length + 1;
    const suggestedId = `EMP${String(count).padStart(3, '0')}`;

    const defaultDept = departments[0]?.id || '';
    const deptObj = departments.find(d => d.id === defaultDept);
    const defaultPos = deptObj?.jobPositions?.[0]?.id || '';
    const defaultSched = schedules[0]?.id || '';
    const defaultStruct = structures[0]?.id || '';

    setFormData({
      ...initialFormState,
      employeeId: suggestedId,
      departmentId: defaultDept ? String(defaultDept) : '',
      jobPositionId: defaultPos ? String(defaultPos) : '',
      workingScheduleId: defaultSched ? String(defaultSched) : '',
      salaryStructureId: defaultStruct ? String(defaultStruct) : '',
    });
    setPositions(deptObj?.jobPositions || []);
    setShowCreateModal(true);
  }

  function openEditModal() {
    if (!selectedEmployee) return;
    const deptObj = departments.find(d => d.id === selectedEmployee.departmentId);
    setPositions(deptObj?.jobPositions || []);

    setFormData({
      employeeId: selectedEmployee.employeeId || '',
      name: selectedEmployee.name || '',
      email: selectedEmployee.email || '',
      phone: selectedEmployee.phone || '',
      departmentId: selectedEmployee.departmentId ? String(selectedEmployee.departmentId) : '',
      jobPositionId: selectedEmployee.jobPositionId ? String(selectedEmployee.jobPositionId) : '',
      managerId: selectedEmployee.managerId ? String(selectedEmployee.managerId) : '',
      employeeType: selectedEmployee.employeeType || 'FULL_TIME',
      status: selectedEmployee.status || 'ACTIVE',
      joiningDate: selectedEmployee.joiningDate ? selectedEmployee.joiningDate.slice(0, 10) : '',
      workingScheduleId: selectedEmployee.workingScheduleId ? String(selectedEmployee.workingScheduleId) : '',
      bankAccountNumber: selectedEmployee.bankAccountNumber || '',
      bankName: selectedEmployee.bankName || '',
      bankIfscCode: selectedEmployee.bankIfscCode || '',
      panNumber: selectedEmployee.panNumber || '',
      createInitialContract: false,
      initialWage: '',
      salaryStructureId: '',
      contractNotes: '',
    });
    setShowEditModal(true);
  }

  function handleDepartmentChange(deptId, targetForm = 'form') {
    const parsedId = parseInt(deptId, 10);
    const deptObj = departments.find(d => d.id === parsedId);
    const posList = deptObj?.jobPositions || [];
    setPositions(posList);

    if (targetForm === 'form') {
      setFormData(prev => ({
        ...prev,
        departmentId: deptId,
        jobPositionId: posList[0]?.id ? String(posList[0].id) : '',
      }));
    }
  }

  async function handleCreateEmployee(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        employeeId: formData.employeeId.trim(),
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        departmentId: parseInt(formData.departmentId, 10),
        jobPositionId: parseInt(formData.jobPositionId, 10),
        managerId: formData.managerId ? parseInt(formData.managerId, 10) : undefined,
        employeeType: formData.employeeType,
        status: formData.status,
        joiningDate: formData.joiningDate,
        workingScheduleId: formData.workingScheduleId ? parseInt(formData.workingScheduleId, 10) : undefined,
        bankAccountNumber: formData.bankAccountNumber.trim() || undefined,
        bankName: formData.bankName.trim() || undefined,
        bankIfscCode: formData.bankIfscCode.trim() || undefined,
        panNumber: formData.panNumber.trim() || undefined,
      };

      if (formData.createInitialContract && formData.initialWage && formData.salaryStructureId) {
        payload.initialWage = formData.initialWage;
        payload.salaryStructureId = formData.salaryStructureId;
        payload.contractNotes = formData.contractNotes;
      }

      const res = await api.post('/employees', payload);
      setShowCreateModal(false);
      setNotice({ type: 'success', message: `Employee "${res.data.name}" created successfully with initial records.` });

      await fetchEmployees();
      if (res.data?.id) {
        handleSelectEmployee(res.data);
      }
    } catch (err) {
      setNotice({ type: 'error', message: err.message || 'Failed to create employee.' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdateEmployee(e) {
    e.preventDefault();
    if (!selectedEmployee) return;
    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || null,
        departmentId: parseInt(formData.departmentId, 10),
        jobPositionId: parseInt(formData.jobPositionId, 10),
        managerId: formData.managerId ? parseInt(formData.managerId, 10) : null,
        employeeType: formData.employeeType,
        status: formData.status,
        workingScheduleId: formData.workingScheduleId ? parseInt(formData.workingScheduleId, 10) : null,
        bankAccountNumber: formData.bankAccountNumber.trim() || null,
        bankName: formData.bankName.trim() || null,
        bankIfscCode: formData.bankIfscCode.trim() || null,
        panNumber: formData.panNumber.trim() || null,
      };

      await api.put(`/employees/${selectedEmployee.id}`, payload);
      setShowEditModal(false);
      setNotice({ type: 'success', message: `Employee profile updated successfully.` });

      // Refresh both list and current detail
      await fetchEmployees();
      const updated = await api.get(`/employees/${selectedEmployee.id}`);
      setSelectedEmployee(updated.data);
    } catch (err) {
      setNotice({ type: 'error', message: err.message || 'Failed to update employee.' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteEmployee() {
    if (!selectedEmployee) return;
    setSubmitting(true);
    try {
      const res = await api.delete(`/employees/${selectedEmployee.id}`);
      setShowDeleteModal(false);
      setSelectedEmployee(null);
      setNotice({ type: 'success', message: res.data?.message || 'Employee record processed successfully.' });
      await fetchEmployees();
    } catch (err) {
      setNotice({ type: 'error', message: err.message || 'Failed to delete employee.' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCreateContract(e) {
    e.preventDefault();
    if (!selectedEmployee) return;
    setSubmitting(true);
    try {
      await api.post('/contracts', {
        employeeId: selectedEmployee.id,
        startDate: contractFormData.startDate,
        endDate: contractFormData.endDate || null,
        wage: parseFloat(contractFormData.wage),
        salaryStructureId: parseInt(contractFormData.salaryStructureId, 10),
        notes: contractFormData.notes,
        status: 'ACTIVE',
      });
      setShowContractModal(false);
      setNotice({ type: 'success', message: `New active contract issued for ${selectedEmployee.name} at ₹${parseFloat(contractFormData.wage).toLocaleString()}/month.` });

      // Refresh employee details to show new active contract
      const updated = await api.get(`/employees/${selectedEmployee.id}`);
      setSelectedEmployee(updated.data);
      await fetchEmployees();
    } catch (err) {
      setNotice({ type: 'error', message: err.message || 'Failed to issue contract.' });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDownloadPayslipPdf(payslipId) {
    setDownloadingPdf(payslipId);
    try {
      const res = await api.get(`/payslips/${payslipId}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data || res], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      alert(err.message || 'Failed to download payslip PDF.');
    } finally {
      setDownloadingPdf(null);
    }
  }

  // Filtered employees for list / kanban
  const filteredEmployees = employees.filter((emp) => {
    const q = search.toLowerCase();
    const matchesSearch = (
      emp.name?.toLowerCase().includes(q) ||
      emp.employeeId?.toLowerCase().includes(q) ||
      emp.email?.toLowerCase().includes(q) ||
      emp.department?.name?.toLowerCase().includes(q) ||
      emp.jobPosition?.title?.toLowerCase().includes(q)
    );
    const matchesDept = !departmentFilter || emp.departmentId === parseInt(departmentFilter, 10);
    const matchesStatus = !statusFilter || emp.status === statusFilter;
    return matchesSearch && matchesDept && matchesStatus;
  });

  const activeContract = selectedEmployee?.contracts?.find(c => c.status === 'ACTIVE') || selectedEmployee?.contracts?.[0];

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-16">
      {/* Top Banner Alert Notice */}
      {notice && (
        <div className={`py-2.5 px-4 text-xs font-medium flex items-center justify-between border-b ${
          notice.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <div className="max-w-7xl mx-auto flex items-center gap-2 w-full">
            {notice.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            <span>{notice.message}</span>
            <button onClick={() => setNotice(null)} className="ml-auto text-slate-400 hover:text-slate-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Control Panel Header */}
      <ControlPanel
        title={isEmployee ? "My Profile & Payroll" : (selectedEmployee ? selectedEmployee.name : "Employees")}
        subtitle={isEmployee 
          ? `${selectedEmployee?.employeeId || ''} • ${selectedEmployee?.jobPosition?.title || 'Self Service Portal'}` 
          : (selectedEmployee ? `${selectedEmployee.employeeId} • ${selectedEmployee.jobPosition?.title || ''}` : "Enterprise Personnel, Compensation & Contracts Management")}
        breadcrumbs={
          isEmployee
            ? [{ label: 'My Profile' }]
            : (selectedEmployee 
                ? [{ label: 'Employees', onClick: () => setSelectedEmployee(null) }, { label: selectedEmployee.name }]
                : [{ label: 'Employees' }])
        }
        actions={
          isEmployee ? (
            <button 
              onClick={() => handleSelectEmployee(selectedEmployee)} 
              className="btn-outline text-xs flex items-center gap-1.5"
              title="Refresh My Profile"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
          ) : (
            selectedEmployee ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedEmployee(null)}
                  className="btn-outline text-xs flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Directory</span>
                </button>
                {canManageEmployees && (
                  <>
                    <button
                      onClick={openEditModal}
                      className="btn-primary text-xs flex items-center gap-1.5"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit Employee</span>
                    </button>
                    <button
                      onClick={() => setShowContractModal(true)}
                      className="btn-outline text-xs text-teal-700 hover:bg-teal-50 border-teal-300 flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5 text-teal-600" />
                      <span>New Contract</span>
                    </button>
                    <button
                      onClick={() => setShowDeleteModal(true)}
                      className="btn-outline text-xs text-rose-600 hover:bg-rose-50 border-rose-200 flex items-center gap-1.5"
                      title="Deactivate or delete employee record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Deactivate</span>
                    </button>
                  </>
                )}
              </div>
            ) : (
              canManageEmployees && (
                <button
                  onClick={openCreateModal}
                  className="btn-primary text-xs flex items-center gap-1.5 shadow-sm"
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

        {/* ========================================================================= */}
        {/* VIEW 1: FULL DETAILED EMPLOYEE PROFILE WITH COMPREHENSIVE PAYROLL         */}
        {/* ========================================================================= */}
        {selectedEmployee ? (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-in fade-in duration-150">
            
            {/* Employee Header & Status Card */}
            <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-gradient-to-r from-slate-50 via-white to-purple-50/20">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#714B67] to-[#4e2f45] text-white flex items-center justify-center font-bold text-2xl shadow-sm ring-4 ring-purple-100">
                  {selectedEmployee.name ? selectedEmployee.name.slice(0, 2).toUpperCase() : 'EM'}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-[#2C3E50] tracking-tight">{selectedEmployee.name}</h2>
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                      selectedEmployee.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : selectedEmployee.status === 'ON_LEAVE'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}>
                      {selectedEmployee.status}
                    </span>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold border border-slate-200">
                      {selectedEmployee.employeeId}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500 mt-1.5">
                    <span className="flex items-center gap-1 text-slate-700 font-medium">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                      {selectedEmployee.jobPosition?.title || 'Staff Member'}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      {selectedEmployee.department?.name || 'General Department'}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {selectedEmployee.email}
                    </span>
                  </div>
                </div>
              </div>

              {/* Clickable Odoo Smart Stat Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                
                {/* 1. Contracts & Payroll Smart Button */}
                <button
                  type="button"
                  onClick={() => setActiveTab('payroll')}
                  className={`odoo-smart-stat transition-all text-left ${activeTab === 'payroll' ? 'ring-2 ring-[#714B67] bg-purple-50/50' : 'hover:bg-slate-50'}`}
                  title="View Contract & Compensation Details"
                >
                  <FileText className="w-5 h-5 text-[#714B67] shrink-0" />
                  <div>
                    <div className="text-[11px] font-bold text-slate-800">
                      {selectedEmployee.smartButtons?.contractsCount || selectedEmployee.contracts?.length || 0} Contracts
                    </div>
                    <div className="text-[10px] text-teal-700 font-mono font-bold">
                      ₹{(selectedEmployee.smartButtons?.activeWage || activeContract?.wage || 0).toLocaleString()}/mo
                    </div>
                  </div>
                </button>

                {/* 2. Payslips Smart Button */}
                <button
                  type="button"
                  onClick={() => setActiveTab('payroll')}
                  className={`odoo-smart-stat transition-all text-left ${activeTab === 'payroll' ? 'ring-2 ring-blue-500 bg-blue-50/40' : 'hover:bg-slate-50'}`}
                  title="View Payslips History"
                >
                  <DollarSign className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <div className="text-[11px] font-bold text-slate-800">
                      {selectedEmployee.smartButtons?.payslipsCount || selectedEmployee.payslips?.length || 0} Payslips
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Processed Slips
                    </div>
                  </div>
                </button>

                {/* 3. Attendance Smart Button */}
                <button
                  type="button"
                  onClick={() => setActiveTab('attendance')}
                  className={`odoo-smart-stat transition-all text-left ${activeTab === 'attendance' ? 'ring-2 ring-[#00A09D] bg-teal-50/50' : 'hover:bg-slate-50'}`}
                  title="View Attendance Logs"
                >
                  <Clock className="w-5 h-5 text-[#00A09D] shrink-0" />
                  <div>
                    <div className="text-[11px] font-bold text-slate-800">
                      {selectedEmployee.smartButtons?.attendanceCount || selectedEmployee.attendance?.length || 0} Records
                    </div>
                    <div className="text-[10px] text-emerald-600 font-medium">
                      Health: {selectedEmployee.smartButtons?.attendanceHealthPercent || 100}%
                    </div>
                  </div>
                </button>

                {/* 4. Time Off Smart Button */}
                <button
                  type="button"
                  onClick={() => setActiveTab('timeoff')}
                  className={`odoo-smart-stat transition-all text-left ${activeTab === 'timeoff' ? 'ring-2 ring-amber-500 bg-amber-50/50' : 'hover:bg-slate-50'}`}
                  title="View Leave Balances"
                >
                  <Plane className="w-5 h-5 text-amber-600 shrink-0" />
                  <div>
                    <div className="text-[11px] font-bold text-slate-800">
                      {selectedEmployee.smartButtons?.timeOffRemainingDays ?? 18}d Balance
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Remaining Days
                    </div>
                  </div>
                </button>

              </div>
            </div>

            {/* Profile Navigation Tabs */}
            <div className="border-b border-slate-200 px-6 flex flex-wrap gap-6 text-xs font-semibold bg-slate-50/40">
              <button
                onClick={() => setActiveTab('payroll')}
                className={`py-3.5 border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'payroll' 
                    ? 'border-[#714B67] text-[#714B67]' 
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                <span>Payroll & Compensation</span>
                <span className="ml-1 px-1.5 py-0.2 bg-purple-100 text-[#714B67] rounded-full text-[10px]">
                  ₹{(activeContract?.wage || 0).toLocaleString()}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('work')}
                className={`py-3.5 border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'work' 
                    ? 'border-[#714B67] text-[#714B67]' 
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                <span>Work Information</span>
              </button>

              <button
                onClick={() => setActiveTab('private')}
                className={`py-3.5 border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'private' 
                    ? 'border-[#714B67] text-[#714B67]' 
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Private & Banking Details</span>
              </button>

              <button
                onClick={() => setActiveTab('attendance')}
                className={`py-3.5 border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'attendance' 
                    ? 'border-[#714B67] text-[#714B67]' 
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Attendance Logs</span>
              </button>

              <button
                onClick={() => setActiveTab('timeoff')}
                className={`py-3.5 border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'timeoff' 
                    ? 'border-[#714B67] text-[#714B67]' 
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Plane className="w-4 h-4" />
                <span>Time Off & Leave Balances</span>
              </button>
            </div>

            {/* Tab Contents Area */}
            <div className="p-6">

              {/* -------------------- TAB 1: PAYROLL & COMPENSATION -------------------- */}
              {activeTab === 'payroll' && (
                <div className="space-y-8">
                  
                  {/* Active Contract Hero Card */}
                  <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-[#3b2336] text-white rounded-xl p-6 shadow-md border border-slate-700/50">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/10">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-500/30">
                            {activeContract?.status === 'ACTIVE' ? 'Running Contract' : 'Contract Status'}
                          </span>
                          <span className="font-mono text-xs text-white/70">
                            CON/2026/{String(activeContract?.id || selectedEmployee.id).padStart(4, '0')}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                          <span>{activeContract?.salaryStructure?.name || 'Standard IT Salary Structure'}</span>
                        </h3>
                        <p className="text-xs text-white/60 mt-1">
                          Period validity: <span className="text-white font-mono">{activeContract?.startDate ? new Date(activeContract.startDate).toLocaleDateString() : 'Active'}</span>
                          {activeContract?.endDate ? ` to ${new Date(activeContract.endDate).toLocaleDateString()}` : ' (Open-ended / Permanent)'}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 bg-white/5 px-4 py-3 rounded-lg border border-white/10">
                        <div className="text-right">
                          <div className="text-[11px] uppercase tracking-wider text-white/60 font-semibold">Monthly Base Wage</div>
                          <div className="text-2xl font-bold font-mono text-teal-300">
                            ₹{(activeContract?.wage || 0).toLocaleString()}
                          </div>
                        </div>
                        <div className="h-8 w-px bg-white/20"></div>
                        <div className="text-right">
                          <div className="text-[11px] uppercase tracking-wider text-white/60 font-semibold">Annual CTC</div>
                          <div className="text-lg font-bold font-mono text-white/90">
                            ₹{((activeContract?.wage || 0) * 12).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Salary Rules & Components Breakdown Simulation */}
                    <div className="pt-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                      <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                        <div className="text-[11px] text-white/60">Basic Pay (50%)</div>
                        <div className="font-mono font-bold text-white text-sm mt-0.5">
                          ₹{Math.round((activeContract?.wage || 0) * 0.50).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-teal-300 mt-1">Rule: contract.wage * 0.50</div>
                      </div>

                      <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                        <div className="text-[11px] text-white/60">HRA Allowance (25%)</div>
                        <div className="font-mono font-bold text-white text-sm mt-0.5">
                          ₹{Math.round((activeContract?.wage || 0) * 0.25).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-teal-300 mt-1">Rule: BASIC * 0.50</div>
                      </div>

                      <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                        <div className="text-[11px] text-white/60">Provident Fund (PF)</div>
                        <div className="font-mono font-bold text-rose-300 text-sm mt-0.5">
                          - ₹{Math.min(1800, Math.round((activeContract?.wage || 0) * 0.50 * 0.12)).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-rose-300/80 mt-1">Statutory 12% PF Cap</div>
                      </div>

                      <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                        <div className="text-[11px] text-white/60">Est. Take-Home Pay</div>
                        <div className="font-mono font-bold text-emerald-300 text-sm mt-0.5">
                          ₹{Math.round((activeContract?.wage || 0) - Math.min(1800, (activeContract?.wage || 0) * 0.06) - 200).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-emerald-300/80 mt-1">Net Monthly In-Hand</div>
                      </div>
                    </div>

                    {activeContract?.notes && (
                      <div className="mt-4 pt-3 border-t border-white/10 text-xs text-white/70 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-teal-300" />
                        <span>Contract Terms / Notes: {activeContract.notes}</span>
                      </div>
                    )}
                  </div>

                  {/* Section: Employee Payslips History */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-[#714B67]" />
                        <h4 className="font-bold text-sm text-[#2C3E50]">Generated Payslips for {selectedEmployee.name}</h4>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">
                          {selectedEmployee.payslips?.length || 0} Slips
                        </span>
                      </div>
                    </div>

                    {selectedEmployee.payslips && selectedEmployee.payslips.length > 0 ? (
                      <div className="border border-slate-200 rounded-lg overflow-hidden shadow-xs">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                            <tr>
                              <th className="px-4 py-3">Payslip #</th>
                              <th className="px-4 py-3">Payrun Period</th>
                              <th className="px-4 py-3">Working Days</th>
                              <th className="px-4 py-3">Gross Earnings</th>
                              <th className="px-4 py-3">Deductions</th>
                              <th className="px-4 py-3">Net Salary</th>
                              <th className="px-4 py-3">Status</th>
                              <th className="px-4 py-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            {selectedEmployee.payslips.map((slip) => (
                              <tr key={slip.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 font-mono font-bold text-[#714B67]">
                                  {slip.payslipNumber}
                                </td>
                                <td className="px-4 py-3 font-medium text-slate-900">
                                  {slip.payrun?.name || 'Monthly Payroll'}
                                </td>
                                <td className="px-4 py-3 font-mono">
                                  {slip.presentDays || 22} / {slip.workingDays || 22} d
                                </td>
                                <td className="px-4 py-3 font-mono font-medium text-slate-800">
                                  ₹{slip.grossSalary?.toLocaleString() || 0}
                                </td>
                                <td className="px-4 py-3 font-mono font-medium text-rose-600">
                                  - ₹{slip.totalDeductions?.toLocaleString() || 0}
                                </td>
                                <td className="px-4 py-3 font-mono font-bold text-teal-700 text-sm">
                                  ₹{slip.netSalary?.toLocaleString() || 0}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                                    slip.status === 'PAID'
                                      ? 'bg-teal-50 text-[#00A09D] border-[#00A09D]/30'
                                      : slip.status === 'VALIDATED'
                                      ? 'bg-purple-50 text-[#714B67] border-[#714B67]/30'
                                      : 'bg-slate-100 text-slate-700 border-slate-300'
                                  }`}>
                                    {slip.status}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    onClick={() => handleDownloadPayslipPdf(slip.id)}
                                    disabled={downloadingPdf === slip.id}
                                    className="btn-outline text-xs px-2.5 py-1 text-slate-700 hover:text-[#714B67] hover:border-[#714B67] inline-flex items-center gap-1.5"
                                  >
                                    {downloadingPdf === slip.id ? (
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Download className="w-3.5 h-3.5" />
                                    )}
                                    <span>Download PDF</span>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-dashed border-slate-200 rounded-lg p-6 text-center text-xs text-slate-500">
                        <DollarSign className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="font-semibold text-slate-700">No payslips processed yet for this employee.</p>
                        <p className="text-slate-400 mt-0.5">Payslips are automatically generated when a monthly Payrun is computed in the Payroll module.</p>
                      </div>
                    )}
                  </div>

                  {/* Section: Historical Contracts Table */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#714B67]" />
                        <h4 className="font-bold text-sm text-[#2C3E50]">Employment Contracts Timeline</h4>
                      </div>
                      {canManageEmployees && (
                        <button
                          onClick={() => setShowContractModal(true)}
                          className="btn-outline text-xs px-2.5 py-1 text-teal-700 border-teal-300 hover:bg-teal-50 flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Issue New Contract</span>
                        </button>
                      )}
                    </div>

                    <div className="border border-slate-200 rounded-lg overflow-hidden shadow-xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                          <tr>
                            <th className="px-4 py-3">Contract Ref</th>
                            <th className="px-4 py-3">Start Date</th>
                            <th className="px-4 py-3">End Date</th>
                            <th className="px-4 py-3">Wage / Month</th>
                            <th className="px-4 py-3">Salary Structure</th>
                            <th className="px-4 py-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {selectedEmployee.contracts && selectedEmployee.contracts.length > 0 ? (
                            selectedEmployee.contracts.map((c) => (
                              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 font-mono font-semibold text-[#714B67]">
                                  CON/2026/{String(c.id).padStart(4, '0')}
                                </td>
                                <td className="px-4 py-3 font-mono">{new Date(c.startDate).toLocaleDateString()}</td>
                                <td className="px-4 py-3 font-mono">
                                  {c.endDate ? new Date(c.endDate).toLocaleDateString() : <span className="text-slate-400">Open-ended</span>}
                                </td>
                                <td className="px-4 py-3 font-mono font-bold text-teal-700 text-sm">
                                  ₹{c.wage?.toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-slate-600">{c.salaryStructure?.name || 'Standard Structure'}</td>
                                <td className="px-4 py-3">
                                  <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                                    c.status === 'ACTIVE'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : 'bg-slate-100 text-slate-600 border-slate-300'
                                  }`}>
                                    {c.status === 'ACTIVE' ? 'Running' : 'Expired / Past'}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={6} className="text-center py-6 text-slate-400">
                                No contracts on file for this employee.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>
              )}

              {/* -------------------- TAB 2: WORK INFORMATION -------------------- */}
              {activeTab === 'work' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
                  <div className="space-y-4">
                    <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] text-[#714B67] flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>Organizational Structure</span>
                    </h3>
                    <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Department:</span>
                      <span className="col-span-2 font-semibold text-slate-800">{selectedEmployee.department?.name || 'N/A'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Job Position:</span>
                      <span className="col-span-2 font-semibold text-slate-800">{selectedEmployee.jobPosition?.title || 'N/A'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Reports To (Manager):</span>
                      <span className="col-span-2 font-semibold text-slate-800">
                        {selectedEmployee.manager ? `${selectedEmployee.manager.name} (${selectedEmployee.manager.employeeId})` : 'None (Department Lead)'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Employment Type:</span>
                      <span className="col-span-2 font-semibold text-slate-800">{selectedEmployee.employeeType}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Employment Status:</span>
                      <span className="col-span-2 font-semibold text-slate-800">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {selectedEmployee.status}
                        </span>
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] text-[#714B67] flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Working Schedule & Timeline</span>
                    </h3>
                    <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Working Schedule:</span>
                      <span className="col-span-2 font-semibold text-slate-800">
                        {selectedEmployee.workingSchedule?.name || 'Standard 40-Hour Workweek'} ({selectedEmployee.workingSchedule?.weeklyHours || 40} hrs/week)
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Joining Date:</span>
                      <span className="col-span-2 font-semibold text-slate-800">
                        {selectedEmployee.joiningDate ? new Date(selectedEmployee.joiningDate).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Work Email:</span>
                      <span className="col-span-2 font-semibold text-slate-800">{selectedEmployee.email}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Work Phone:</span>
                      <span className="col-span-2 font-semibold text-slate-800">{selectedEmployee.phone || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* -------------------- TAB 3: PRIVATE & BANKING -------------------- */}
              {activeTab === 'private' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs">
                  <div className="space-y-4">
                    <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] text-[#714B67] flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Direct Deposit & Bank Information</span>
                    </h3>
                    <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Bank Name:</span>
                      <span className="col-span-2 font-semibold text-slate-800">
                        {selectedEmployee.bankName || <span className="text-rose-600 font-medium">Missing Bank Name</span>}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Account Number:</span>
                      <span className="col-span-2 font-mono font-semibold text-slate-800">
                        {selectedEmployee.bankAccountNumber || <span className="text-rose-600 font-medium">Missing Account Number</span>}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">IFSC Code:</span>
                      <span className="col-span-2 font-mono font-semibold text-slate-800">
                        {selectedEmployee.bankIfscCode || <span className="text-rose-600 font-medium">Missing IFSC Code</span>}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Disbursement:</span>
                      <span className="col-span-2 text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Automated Direct Bank Transfer Eligible
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] text-[#714B67] flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" />
                      <span>Tax & Statutory Identification</span>
                    </h3>
                    <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">PAN Number:</span>
                      <span className="col-span-2 font-mono font-bold text-slate-800 uppercase">
                        {selectedEmployee.panNumber || <span className="text-amber-600">Pending Submission</span>}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">PF (Provident Fund):</span>
                      <span className="col-span-2 text-slate-700">Enrolled (Statutory deductions applied per rules)</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 py-2 border-b border-slate-100">
                      <span className="text-slate-500 font-medium">Professional Tax:</span>
                      <span className="col-span-2 text-slate-700">Applicable state slab (₹200/mo)</span>
                    </div>
                  </div>
                </div>
              )}

              {/* -------------------- TAB 4: ATTENDANCE LOGS -------------------- */}
              {activeTab === 'attendance' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-[#2C3E50]">Recent Attendance Logs (Last 30 Records)</h4>
                    <span className="text-xs text-slate-500">Auto-synchronized with Payroll Engine</span>
                  </div>

                  {selectedEmployee.attendance && selectedEmployee.attendance.length > 0 ? (
                    <div className="border border-slate-200 rounded-lg overflow-hidden shadow-xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                          <tr>
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Check In</th>
                            <th className="px-4 py-3">Check Out</th>
                            <th className="px-4 py-3">Working Hours</th>
                            <th className="px-4 py-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {selectedEmployee.attendance.map((att) => (
                            <tr key={att.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-4 py-3 font-medium">{new Date(att.date).toLocaleDateString()}</td>
                              <td className="px-4 py-3 font-mono text-slate-600">{att.checkIn ? new Date(att.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                              <td className="px-4 py-3 font-mono text-slate-600">{att.checkOut ? new Date(att.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                              <td className="px-4 py-3 font-mono font-semibold text-slate-800">{att.totalHours ? `${att.totalHours} hrs` : '-'}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                                  att.status === 'PRESENT'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : att.status === 'OVERTIME'
                                    ? 'bg-purple-50 text-[#714B67] border-[#714B67]/30'
                                    : att.status === 'LATE'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-rose-50 text-rose-700 border-rose-200'
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
                    <div className="bg-slate-50 border border-dashed border-slate-200 rounded-lg p-6 text-center text-xs text-slate-500">
                      <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p>No attendance records logged yet for this employee.</p>
                    </div>
                  )}
                </div>
              )}

              {/* -------------------- TAB 5: TIME OFF & LEAVE BALANCES -------------------- */}
              {activeTab === 'timeoff' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {selectedEmployee.timeOffAllocations?.map((alloc) => (
                      <div key={alloc.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <div className="text-xs font-bold text-slate-700">{alloc.timeOffType?.name || 'Leave Type'}</div>
                        <div className="mt-3 flex items-baseline justify-between">
                          <span className="text-2xl font-bold text-[#714B67] font-mono">{alloc.remainingDays}</span>
                          <span className="text-xs text-slate-500">of {alloc.allocatedDays} days remaining</span>
                        </div>
                        <div className="mt-2 text-[10px] text-slate-500">Taken: {alloc.takenDays} days</div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3 pt-2">
                    <h4 className="font-bold text-sm text-[#2C3E50]">Recent Leave Requests</h4>
                    {selectedEmployee.timeOffRequests && selectedEmployee.timeOffRequests.length > 0 ? (
                      <div className="border border-slate-200 rounded-lg overflow-hidden shadow-xs">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                            <tr>
                              <th className="px-4 py-3">Type</th>
                              <th className="px-4 py-3">Start Date</th>
                              <th className="px-4 py-3">End Date</th>
                              <th className="px-4 py-3">Duration</th>
                              <th className="px-4 py-3">Reason</th>
                              <th className="px-4 py-3">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            {selectedEmployee.timeOffRequests.map((req) => (
                              <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-4 py-3 font-semibold text-[#714B67]">{req.timeOffType?.name}</td>
                                <td className="px-4 py-3 font-mono">{new Date(req.startDate).toLocaleDateString()}</td>
                                <td className="px-4 py-3 font-mono">{new Date(req.endDate).toLocaleDateString()}</td>
                                <td className="px-4 py-3 font-semibold">{req.durationDays} days</td>
                                <td className="px-4 py-3 text-slate-600">{req.reason || '-'}</td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                                    req.status === 'APPROVED'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : req.status === 'PENDING'
                                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                                  }`}>
                                    {req.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-dashed border-slate-200 rounded-lg p-6 text-center text-xs text-slate-500">
                        <Plane className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p>No recent time off requests recorded.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>

          </div>
        ) : (
          /* ========================================================================= */
          /* VIEW 2: DIRECTORY LIST / KANBAN VIEW                                      */
          /* ========================================================================= */
          <div className="space-y-4">
            
            {/* Filter Bar */}
            <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-semibold text-slate-600">Filters:</span>
                
                {/* Department Filter */}
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                >
                  <option value="">All Departments</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                >
                  <option value="">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="ON_LEAVE">On Leave</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="TERMINATED">Terminated</option>
                </select>
              </div>

              <div className="text-slate-500 font-medium">
                Showing <span className="font-bold text-slate-800">{filteredEmployees.length}</span> of {employees.length} employees
              </div>
            </div>

            {loading ? (
              <div className="min-h-[300px] flex items-center justify-center bg-white border border-slate-200 rounded-lg">
                <div className="flex flex-col items-center gap-2">
                  <RefreshCw className="w-6 h-6 text-[#714B67] animate-spin" />
                  <span className="text-xs text-slate-500">Loading personnel directory...</span>
                </div>
              </div>
            ) : filteredEmployees.length === 0 ? (
              <div className="min-h-[300px] flex flex-col items-center justify-center bg-white border border-slate-200 rounded-lg p-8 text-center">
                <Users className="w-12 h-12 text-slate-300 mb-3" />
                <h3 className="font-bold text-slate-700 text-sm">No employees match your criteria</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">Try clearing filters or search query, or create a new employee record.</p>
                {canManageEmployees && (
                  <button onClick={openCreateModal} className="btn-primary text-xs mt-4">
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add First Employee</span>
                  </button>
                )}
              </div>
            ) : viewMode === 'kanban' ? (
              /* KANBAN CARDS */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredEmployees.map((emp) => (
                  <div
                    key={emp.id}
                    onClick={() => handleSelectEmployee(emp)}
                    className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-[#714B67] hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-purple-50 text-[#714B67] font-bold flex items-center justify-center border border-purple-100 text-sm group-hover:bg-[#714B67] group-hover:text-white transition-colors">
                            {emp.name ? emp.name.slice(0, 2).toUpperCase() : 'EM'}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-900 text-sm group-hover:text-[#714B67] transition-colors">
                              {emp.name}
                            </h4>
                            <p className="text-xs text-slate-500">{emp.jobPosition?.title || 'Staff'}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          emp.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-300'
                        }`}>
                          {emp.status}
                        </span>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{emp.department?.name || 'General Dept'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate text-slate-500">{emp.email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <div>
                        <div className="text-[10px] uppercase font-semibold text-slate-400">Base Wage</div>
                        <div className="font-mono font-bold text-teal-700 text-sm">
                          ₹{(emp.activeWage || 0).toLocaleString()} / mo
                        </div>
                      </div>
                      <span className="text-[11px] text-slate-400 flex items-center gap-0.5 group-hover:text-[#714B67] font-mono font-medium">
                        {emp.employeeId}
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* LIST TABLE VIEW */
              <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="px-4 py-3">Employee ID</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Job Position</th>
                      <th className="px-4 py-3">Monthly Wage</th>
                      <th className="px-4 py-3">Leave Balance</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredEmployees.map((emp) => (
                      <tr 
                        key={emp.id} 
                        onClick={() => handleSelectEmployee(emp)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 font-mono font-bold text-[#714B67]">{emp.employeeId}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">{emp.name}</td>
                        <td className="px-4 py-3 text-slate-600">{emp.department?.name}</td>
                        <td className="px-4 py-3 text-slate-600">{emp.jobPosition?.title}</td>
                        <td className="px-4 py-3 font-mono font-bold text-teal-700">₹{(emp.activeWage || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{emp.totalRemainingLeaves ?? 18} Days</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                            emp.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-slate-100 text-slate-600 border-slate-300'
                          }`}>
                            {emp.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-slate-400 hover:text-[#714B67] font-semibold inline-flex items-center gap-0.5">
                            View <ChevronRight className="w-3.5 h-3.5" />
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

      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE EMPLOYEE WITH INTEGRATED PAYROLL SETUP                    */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#714B67]" />
                <h3 className="font-bold text-sm text-[#2C3E50]">Add New Employee & Payroll Setup</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="p-6 space-y-5 text-xs">
              
              {/* Section 1: Basic Information */}
              <div>
                <h4 className="font-bold text-[#714B67] uppercase tracking-wider text-[11px] mb-2.5">
                  1. Identity & Contact Details
                </h4>
                <div className="grid grid-cols-2 gap-3.5">
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
              </div>

              {/* Section 2: Department & Role */}
              <div className="pt-3 border-t border-slate-100">
                <h4 className="font-bold text-[#714B67] uppercase tracking-wider text-[11px] mb-2.5">
                  2. Organizational Role & Schedule
                </h4>
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Department *</label>
                    <select
                      required
                      value={formData.departmentId}
                      onChange={(e) => handleDepartmentChange(e.target.value, 'form')}
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
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Reports To (Manager)</label>
                    <select
                      value={formData.managerId}
                      onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                    >
                      <option value="">None (Top Level / Dept Lead)</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.employeeId})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Employment Type</label>
                    <select
                      value={formData.employeeType}
                      onChange={(e) => setFormData({ ...formData, employeeType: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                    >
                      <option value="FULL_TIME">Full Time</option>
                      <option value="PART_TIME">Part Time</option>
                      <option value="CONTRACTOR">Contractor</option>
                      <option value="INTERN">Intern</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Working Schedule</label>
                    <select
                      value={formData.workingScheduleId}
                      onChange={(e) => setFormData({ ...formData, workingScheduleId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                    >
                      <option value="">Select Working Schedule</option>
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
              </div>

              {/* Section 3: Bank & Statutory Details */}
              <div className="pt-3 border-t border-slate-100">
                <h4 className="font-bold text-[#714B67] uppercase tracking-wider text-[11px] mb-2.5">
                  3. Direct Deposit Banking & Tax PAN
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1">Bank Name</label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC Bank"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Account Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 501004928172"
                      value={formData.bankAccountNumber}
                      onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      placeholder="HDFC0001234"
                      value={formData.bankIfscCode}
                      onChange={(e) => setFormData({ ...formData, bankIfscCode: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs font-mono uppercase"
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-1">
                    <label className="block text-slate-600 mb-1">PAN Number</label>
                    <input
                      type="text"
                      placeholder="ABCDE1234F"
                      value={formData.panNumber}
                      onChange={(e) => setFormData({ ...formData, panNumber: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs font-mono uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Integrated Initial Contract Setup */}
              <div className="pt-3 border-t border-slate-100 bg-purple-50/50 p-4 rounded-lg border border-purple-200">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-[#714B67]" />
                    <span className="font-bold text-[#714B67] text-xs">Initial Employment Contract & Salary Setup</span>
                  </div>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.createInitialContract}
                      onChange={(e) => setFormData({ ...formData, createInitialContract: e.target.checked })}
                      className="rounded text-[#714B67] focus:ring-[#714B67]"
                    />
                    <span className="text-[11px] font-semibold text-slate-700">Activate Contract Immediately</span>
                  </label>
                </div>

                {formData.createInitialContract && (
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Monthly Base Wage (₹) *</label>
                      <input
                        type="number"
                        required={formData.createInitialContract}
                        placeholder="e.g. 50000"
                        value={formData.initialWage}
                        onChange={(e) => setFormData({ ...formData, initialWage: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs font-mono font-bold text-teal-700"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">Salary Structure *</label>
                      <select
                        required={formData.createInitialContract}
                        value={formData.salaryStructureId}
                        onChange={(e) => setFormData({ ...formData, salaryStructureId: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs"
                      >
                        {structures.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-slate-600 mb-1">Contract Notes / Terms</label>
                      <input
                        type="text"
                        placeholder="Standard permanent employment contract"
                        value={formData.contractNotes}
                        onChange={(e) => setFormData({ ...formData, contractNotes: e.target.value })}
                        className="w-full bg-white border border-slate-300 rounded px-3 py-1.5 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-outline text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{submitting ? 'Creating...' : 'Save & Onboard Employee'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT EMPLOYEE PROFILE                                            */}
      {/* ========================================================================= */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Edit className="w-4 h-4 text-[#714B67]" />
                <h3 className="font-bold text-sm text-[#2C3E50]">Edit Employee Profile: {selectedEmployee?.name}</h3>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateEmployee} className="p-6 space-y-5 text-xs">
              
              {/* Identity Details */}
              <div>
                <h4 className="font-bold text-[#714B67] uppercase tracking-wider text-[11px] mb-2.5">
                  Identity & Personal Contact
                </h4>
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Employee ID</label>
                    <input
                      type="text"
                      disabled
                      value={formData.employeeId}
                      className="w-full bg-slate-100 border border-slate-200 rounded px-3 py-1.5 text-xs font-mono font-bold text-slate-600 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Work Email *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                    />
                  </div>
                </div>
              </div>

              {/* Organizational Position */}
              <div className="pt-3 border-t border-slate-100">
                <h4 className="font-bold text-[#714B67] uppercase tracking-wider text-[11px] mb-2.5">
                  Organizational Placement
                </h4>
                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Department *</label>
                    <select
                      required
                      value={formData.departmentId}
                      onChange={(e) => handleDepartmentChange(e.target.value, 'form')}
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
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Employment Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="ON_LEAVE">ON_LEAVE</option>
                      <option value="INACTIVE">INACTIVE</option>
                      <option value="TERMINATED">TERMINATED</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Employment Type</label>
                    <select
                      value={formData.employeeType}
                      onChange={(e) => setFormData({ ...formData, employeeType: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                    >
                      <option value="FULL_TIME">Full Time</option>
                      <option value="PART_TIME">Part Time</option>
                      <option value="CONTRACTOR">Contractor</option>
                      <option value="INTERN">Intern</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Reports To (Manager)</label>
                    <select
                      value={formData.managerId}
                      onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                    >
                      <option value="">None (Top Level)</option>
                      {employees.filter(e => e.id !== selectedEmployee.id).map((emp) => (
                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.employeeId})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Working Schedule</label>
                    <select
                      value={formData.workingScheduleId}
                      onChange={(e) => setFormData({ ...formData, workingScheduleId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                    >
                      <option value="">Select Working Schedule</option>
                      {schedules.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.weeklyHours}h/wk)</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Banking & Statutory Details */}
              <div className="pt-3 border-t border-slate-100">
                <h4 className="font-bold text-[#714B67] uppercase tracking-wider text-[11px] mb-2.5">
                  Banking & Statutory Identification
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 mb-1">Bank Name</label>
                    <input
                      type="text"
                      placeholder="e.g. HDFC Bank"
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">Account Number</label>
                    <input
                      type="text"
                      value={formData.bankAccountNumber}
                      onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={formData.bankIfscCode}
                      onChange={(e) => setFormData({ ...formData, bankIfscCode: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs font-mono uppercase"
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-1">
                    <label className="block text-slate-600 mb-1">PAN Number</label>
                    <input
                      type="text"
                      value={formData.panNumber}
                      onChange={(e) => setFormData({ ...formData, panNumber: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-2.5 py-1.5 text-xs font-mono uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-200">
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
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{submitting ? 'Updating...' : 'Save Profile Changes'}</span>
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: ISSUE NEW EMPLOYMENT CONTRACT                                   */}
      {/* ========================================================================= */}
      {showContractModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-lg w-full">
            
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#714B67]" />
                <h3 className="font-bold text-sm text-[#2C3E50]">Issue Contract: {selectedEmployee.name}</h3>
              </div>
              <button onClick={() => setShowContractModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateContract} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-slate-700 text-xs flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-[#714B67] shrink-0 mt-0.5" />
                <span>Issuing a new contract will mark any existing active contract as Expired up to the new start date, ensuring deterministic payroll calculations.</span>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={contractFormData.startDate}
                    onChange={(e) => setContractFormData({ ...contractFormData, startDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">End Date (Optional)</label>
                  <input
                    type="date"
                    value={contractFormData.endDate}
                    onChange={(e) => setContractFormData({ ...contractFormData, endDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Monthly Base Wage (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 60000"
                    value={contractFormData.wage}
                    onChange={(e) => setContractFormData({ ...contractFormData, wage: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs font-mono font-bold text-teal-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Salary Structure *</label>
                  <select
                    required
                    value={contractFormData.salaryStructureId}
                    onChange={(e) => setContractFormData({ ...contractFormData, salaryStructureId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  >
                    {structures.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Contract Notes / Terms</label>
                <textarea
                  rows={2}
                  placeholder="Terms, wage revision notes, or scope"
                  value={contractFormData.notes}
                  onChange={(e) => setContractFormData({ ...contractFormData, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowContractModal(false)}
                  className="btn-outline text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-xs flex items-center gap-1.5"
                >
                  {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>{submitting ? 'Issuing...' : 'Activate Contract'}</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: DELETE / DEACTIVATE EMPLOYEE CONFIRMATION                         */}
      {/* ========================================================================= */}
      {showDeleteModal && selectedEmployee && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
            
            <div className="p-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-800">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-sm">Deactivate / Terminate Employee</h3>
              </div>
              <button onClick={() => setShowDeleteModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs text-slate-600">
              <p>
                Are you sure you want to remove or deactivate <b>{selectedEmployee.name}</b> ({selectedEmployee.employeeId})?
              </p>
              
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] leading-relaxed">
                <b>Financial Audit Preservation:</b> If this employee has historical processed payslips, their status will safely transition to <b>TERMINATED</b> to preserve payroll accounting logs. If no payslips exist, their record will be deleted.
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="btn-outline text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteEmployee}
                disabled={submitting}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{submitting ? 'Processing...' : 'Confirm Deactivation'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
