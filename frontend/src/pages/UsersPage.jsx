import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, UserPlus, Edit3, Trash2,
  User as UserIcon, Building2, ChevronDown,
  Loader2, AlertCircle, Users, Briefcase, Clock,
  Filter, X
} from 'lucide-react';
import api from '../api/client';
import ControlPanel from '../components/ControlPanel';
import Pagination from '../components/Pagination';
import { useAuth } from '../context/AuthContext';
import { useDebounce } from '../hooks/useDebounce';

// ─── Role metadata ────────────────────────────────────────────────────────────
const ROLE_META = {
  ADMIN: {
    label: 'Admin',
    description: 'Full system configuration & access',
    color: 'bg-rose-100 text-rose-800 border-rose-200',
    needsEmployee: false,
    needsManager: false,
    managerLabel: null,
  },
  HR_MANAGER: {
    label: 'HR Manager',
    description: 'Employees, leaves & attendance management',
    color: 'bg-purple-100 text-purple-800 border-purple-200',
    needsEmployee: true,
    needsManager: false,
    managerLabel: null,
  },
  HR_PAYROLL_MANAGER: {
    label: 'HR Payroll Manager',
    description: 'Full payroll approval & payrun processing',
    color: 'bg-teal-100 text-teal-800 border-teal-200',
    needsEmployee: true,
    needsManager: false,
    managerLabel: null,
  },
  HR_PAYROLL_USER: {
    label: 'HR Payroll User',
    description: 'Draft payruns & payslip preparation',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    needsEmployee: true,
    needsManager: true,
    managerLabel: 'Reports to HR Payroll Manager',
  },
  EMPLOYEE: {
    label: 'Employee',
    description: 'Self-service: attendance, leaves, payslips',
    color: 'bg-slate-100 text-slate-800 border-slate-200',
    needsEmployee: true,
    needsManager: true,
    managerLabel: 'Reports to HR Manager',
  },
};

const ROLE_FILTER_OPTIONS = [
  { value: 'ALL', label: 'All Roles' },
  { value: 'ADMIN', label: 'Admin' },
  { value: 'HR_MANAGER', label: 'HR Manager' },
  { value: 'HR_PAYROLL_MANAGER', label: 'HR Payroll Manager' },
  { value: 'HR_PAYROLL_USER', label: 'HR Payroll User' },
  { value: 'EMPLOYEE', label: 'Employee' },
];

const EMPTY_FORM = {
  name: '',
  email: '',
  password: '',
  role: 'EMPLOYEE',
  departmentId: '',
  jobPositionId: '',
  workingScheduleId: '',
  managerId: '',     // employee.id of the chosen manager (for EMPLOYEE / HR_PAYROLL_USER)
  joiningDate: new Date().toISOString().slice(0, 10),
  employeeType: 'FULL_TIME',
  phone: '',
};

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 50, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Provision options loaded when role changes
  const [provOptions, setProvOptions] = useState(null);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Filtered job positions (only those matching selected dept)
  const filteredJobPositions = provOptions?.jobPositions?.filter(
    (jp) => !form.departmentId || jp.departmentId === parseInt(form.departmentId, 10)
  ) ?? [];

  const fetchUsers = useCallback(async (page = 1, role = selectedRole) => {
    setLoading(true);
    try {
      const params = { page, limit: 50 };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (role && role !== 'ALL') params.role = role;
      const res = await api.get('/users', { params });
      const envelope = res.data;
      setUsers(envelope.data ?? []);
      setPagination({ total: envelope.total, page: envelope.page, limit: envelope.limit, totalPages: envelope.totalPages });
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, selectedRole]);

  useEffect(() => {
    fetchUsers(1, selectedRole);
  }, [debouncedSearch, selectedRole, fetchUsers]);

  const handleRoleFilterChange = (newRole) => {
    setSelectedRole(newRole);
  };

  // Fetch provision options whenever the selected role changes (create mode only)
  const fetchProvisionOptions = useCallback(async (role) => {
    setLoadingOptions(true);
    setProvOptions(null);
    try {
      const res = await api.get(`/users/provision-options?role=${role}`);
      setProvOptions(res.data);
    } catch (err) {
      console.error('Failed to load provision options:', err);
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  function openCreateModal() {
    setEditingUser(null);
    setFormError('');
    const initial = { ...EMPTY_FORM };
    setForm(initial);
    setIsModalOpen(true);
    fetchProvisionOptions(initial.role);
  }

  function openEditModal(user) {
    setEditingUser(user);
    setFormError('');
    setForm({
      name: user.name || '',
      email: user.email,
      password: '',
      role: user.role,
      departmentId: '',
      jobPositionId: '',
      workingScheduleId: '',
      managerId: '',
      joiningDate: new Date().toISOString().slice(0, 10),
      employeeType: 'FULL_TIME',
      phone: '',
    });
    setProvOptions(null);
    setIsModalOpen(true);
  }

  function handleRoleChange(newRole) {
    setForm((f) => ({
      ...f,
      role: newRole,
      departmentId: '',
      jobPositionId: '',
      managerId: '',
    }));
    if (!editingUser) {
      fetchProvisionOptions(newRole);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const meta = ROLE_META[form.role];

      if (editingUser) {
        // Edit mode: only update basic user fields
        const payload = {
          name: form.name,
          email: form.email,
          role: form.role,
        };
        if (form.password) payload.password = form.password;
        await api.put(`/users/${editingUser.id}`, payload);
      } else {
        // Create mode: full hierarchical payload
        if (form.role === 'ADMIN') {
          setFormError('Creating additional Admin accounts is not permitted. Only one system administrator is allowed.');
          setSubmitting(false);
          return;
        }
        if (!form.password) {
          setFormError('Password is required for new accounts.');
          setSubmitting(false);
          return;
        }
        if (meta.needsEmployee && (!form.departmentId || !form.jobPositionId)) {
          setFormError('Department and Job Position are required.');
          setSubmitting(false);
          return;
        }
        if (meta.needsManager && !form.managerId) {
          setFormError(`Please select a ${meta.managerLabel}.`);
          setSubmitting(false);
          return;
        }

        const payload = {
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          phone: form.phone || undefined,
          joiningDate: form.joiningDate,
          employeeType: form.employeeType,
          ...(meta.needsEmployee && {
            departmentId: form.departmentId,
            jobPositionId: form.jobPositionId,
            workingScheduleId: form.workingScheduleId || undefined,
          }),
          ...(meta.needsManager && form.managerId && {
            managerId: form.managerId, // this is the employee.id of the manager user
          }),
        };

        await api.post('/users', payload);
      }

      setIsModalOpen(false);
      await fetchUsers();
    } catch (err) {
      const msg = err?.response?.data?.message || err.message || 'Operation failed.';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this user? Their employee profile will remain intact.')) return;
    try {
      await api.delete(`/users/${id}`);
      await fetchUsers(1);
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to delete user');
    }
  }

  // Users are already filtered server-side via debouncedSearch
  const filteredUsers = users;

  const meta = ROLE_META[form.role] ?? ROLE_META.EMPLOYEE;

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-12">
      <ControlPanel
        title="Users & Access Control"
        subtitle="Role-Based Authentication & Permissions"
        breadcrumbs={[{ label: 'Settings' }, { label: 'Users & Access Control' }]}
        actions={
          <button
            onClick={openCreateModal}
            className="btn-odoo-primary text-xs flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Create User</span>
          </button>
        }
        searchPlaceholder="Search user name, email, or role..."
        searchQuery={searchTerm}
        onSearchChange={(v) => { setSearchTerm(v); }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Header banner */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded bg-purple-50 border border-purple-200 text-[#714B67]">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 text-sm">System Access & Role Assignments</h2>
              <p className="text-xs text-slate-500">
                Manage credentials and link accounts to employee profiles. New users automatically get an employee profile.
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Accounts</span>
            <span className="text-xl font-bold text-slate-800">{pagination.total}</span>
          </div>
        </div>

        {/* Quick Role Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 bg-white p-3 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mr-1">
              <Filter className="w-3.5 h-3.5 text-[#714B67]" />
              Filter by Role:
            </span>
            {ROLE_FILTER_OPTIONS.map((opt) => {
              const isActive = selectedRole === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleRoleFilterChange(opt.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#714B67] text-white shadow-xs font-semibold ring-1 ring-[#714B67]'
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
            {selectedRole !== 'ALL' && (
              <button
                type="button"
                onClick={() => handleRoleFilterChange('ALL')}
                className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 ml-2 font-medium underline underline-offset-2 transition-colors cursor-pointer"
              >
                <X className="w-3 h-3" />
                Clear Filter
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="user-role-select" className="text-xs text-slate-500 font-medium hidden sm:inline">
              Role:
            </label>
            <select
              id="user-role-select"
              value={selectedRole}
              onChange={(e) => handleRoleFilterChange(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded px-2.5 py-1 text-slate-700 font-medium focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67] focus:border-[#714B67] cursor-pointer"
            >
              {ROLE_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">User Directory</span>
              {selectedRole !== 'ALL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 text-[#714B67] border border-purple-200">
                  {ROLE_FILTER_OPTIONS.find(r => r.value === selectedRole)?.label} ({pagination.total})
                </span>
              )}
            </div>
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={pagination.limit}
              onPageChange={(p) => fetchUsers(p, selectedRole)}
            />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[650px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500 tracking-wider">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Employee Profile</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1" />
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">No matching user accounts found.</td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs">
                            {(u.name || u.email).substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div>{u.name || 'Unnamed User'}</div>
                            <div className="text-xs text-slate-400 font-normal">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2.5 py-0.5 rounded border font-medium ${ROLE_META[u.role]?.color || 'bg-slate-100'}`}>
                          {ROLE_META[u.role]?.label || u.role.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {u.employee ? (
                          <span className="font-medium text-slate-800">
                            {u.employee.name}{' '}
                            <span className="text-slate-400 font-mono">({u.employee.employeeId})</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">No employee profile</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {u.employee?.department?.name || '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-1 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded"
                            title="Edit User"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          {u.id !== currentUser?.id && u.role !== 'ADMIN' && (
                            <button
                              onClick={() => handleDelete(u.id)}
                              className="p-1 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded"
                              title="Delete User"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ─── Create / Edit Modal ─────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg my-8 border border-slate-200">

            {/* Modal Header */}
            <div className="px-6 pt-6 pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingUser ? `Edit User: ${editingUser.name || editingUser.email}` : 'Create New User'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {editingUser
                  ? 'Update login credentials or role assignment.'
                  : 'A system login + employee profile will be created together.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4 text-sm">

              {/* Error banner */}
              {formError && (
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg px-3 py-2.5 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {formError}
                </div>
              )}

              {/* ── Role selector (always shown first) ── */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-2">System Role *</label>
                {editingUser && editingUser.role === 'ADMIN' ? (
                  <div className="p-3 rounded-lg border border-rose-200 bg-rose-50">
                    <span className="text-xs px-2 py-0.5 rounded border font-semibold bg-rose-100 text-rose-800 border-rose-200">
                      Admin
                    </span>
                    <p className="text-xs text-rose-700 mt-1">
                      Primary System Administrator (Role cannot be modified).
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-2">
                    {Object.entries(ROLE_META)
                      .filter(([roleKey]) => roleKey !== 'ADMIN')
                      .map(([roleKey, rmeta]) => (
                        <label
                          key={roleKey}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                            form.role === roleKey
                              ? 'border-[#714B67] bg-purple-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="role"
                            value={roleKey}
                            checked={form.role === roleKey}
                            onChange={() => handleRoleChange(roleKey)}
                            className="accent-[#714B67]"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-0.5 rounded border font-semibold ${rmeta.color}`}>
                                {rmeta.label}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">{rmeta.description}</p>
                          </div>
                        </label>
                      ))}
                  </div>
                )}
              </div>

              {/* ── Basic fields ── */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ravi Shah"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="user@company.com"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    {editingUser ? 'New Password (leave blank to keep)' : 'Password *'}
                  </label>
                  <input
                    type="password"
                    required={!editingUser}
                    placeholder={editingUser ? '••••••••' : 'Min 6 characters'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>
              </div>

              {/* ── Employee profile fields (non-ADMIN, create mode only) ── */}
              {!editingUser && meta.needsEmployee && (
                <>
                  <div className="border-t border-slate-100 pt-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5" />
                      Employee Profile Details
                    </p>

                    {loadingOptions ? (
                      <div className="flex items-center gap-2 text-slate-400 text-xs py-3">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Loading options...
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">

                        {/* Department */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">
                            <Building2 className="w-3 h-3 inline mr-1" />
                            Department *
                          </label>
                          <select
                            required
                            value={form.departmentId}
                            onChange={(e) => setForm({ ...form, departmentId: e.target.value, jobPositionId: '' })}
                            className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#714B67] text-sm"
                          >
                            <option value="">Select department</option>
                            {provOptions?.departments?.map((d) => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        </div>

                        {/* Job Position */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Job Position *</label>
                          <select
                            required
                            value={form.jobPositionId}
                            onChange={(e) => setForm({ ...form, jobPositionId: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#714B67] text-sm"
                            disabled={!form.departmentId}
                          >
                            <option value="">Select position</option>
                            {filteredJobPositions.map((jp) => (
                              <option key={jp.id} value={jp.id}>{jp.title}</option>
                            ))}
                          </select>
                        </div>

                        {/* Working Schedule */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">
                            <Clock className="w-3 h-3 inline mr-1" />
                            Working Schedule
                          </label>
                          <select
                            value={form.workingScheduleId}
                            onChange={(e) => setForm({ ...form, workingScheduleId: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#714B67] text-sm"
                          >
                            <option value="">None / Default</option>
                            {provOptions?.workingSchedules?.map((ws) => (
                              <option key={ws.id} value={ws.id}>{ws.name} ({ws.weeklyHours}h/wk)</option>
                            ))}
                          </select>
                        </div>

                        {/* Employee Type */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Employment Type</label>
                          <select
                            value={form.employeeType}
                            onChange={(e) => setForm({ ...form, employeeType: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#714B67] text-sm"
                          >
                            <option value="FULL_TIME">Full Time</option>
                            <option value="PART_TIME">Part Time</option>
                            <option value="CONTRACTOR">Contractor</option>
                            <option value="INTERN">Intern</option>
                          </select>
                        </div>

                        {/* Joining Date */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Joining Date</label>
                          <input
                            type="date"
                            value={form.joiningDate}
                            onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#714B67] text-sm"
                          />
                        </div>

                        {/* Phone */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">Phone</label>
                          <input
                            type="text"
                            placeholder="+91 98765 43210"
                            value={form.phone}
                            onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#714B67] text-sm"
                          />
                        </div>

                        {/* Manager (role-specific) */}
                        {meta.needsManager && (
                          <div className="col-span-2">
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              <Users className="w-3 h-3 inline mr-1" />
                              {meta.managerLabel} *
                            </label>
                            {provOptions?.managers?.length === 0 ? (
                              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2 text-xs">
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                No {meta.managerLabel?.replace('Reports to ', '')} found. Create one first before adding this role.
                              </div>
                            ) : (
                              <select
                                required
                                value={form.managerId}
                                onChange={(e) => setForm({ ...form, managerId: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#714B67] text-sm"
                              >
                                <option value="">Select manager</option>
                                {provOptions?.managers?.map((m) => (
                                  <option key={m.employee.id} value={m.employee.id}>
                                    {m.name} — {m.employee.department?.name} ({m.employee.employeeId})
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        )}

                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Footer buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || (meta.needsEmployee && !editingUser && loadingOptions)}
                  className="btn-odoo-primary px-5 py-2 text-sm flex items-center gap-2 disabled:opacity-60"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingUser ? 'Update Account' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
