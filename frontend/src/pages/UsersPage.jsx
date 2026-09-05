import React, { useState, useEffect } from 'react';
import { 
  Shield, UserPlus, Edit3, Trash2, CheckCircle2, 
  Key, Mail, User as UserIcon, Building2, Search 
} from 'lucide-react';
import api from '../api/client';
import ControlPanel from '../components/ControlPanel';
import { useAuth } from '../context/AuthContext';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'EMPLOYEE',
    employeeId: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [usersRes, empRes] = await Promise.all([
        api.get('/users'),
        api.get('/employees?status=ACTIVE'),
      ]);
      setUsers(usersRes.data);
      setEmployees(empRes.data);
    } catch (err) {
      console.error('Failed to load user data:', err);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingUser(null);
    setForm({
      name: '',
      email: '',
      password: '',
      role: 'EMPLOYEE',
      employeeId: '',
    });
    setIsModalOpen(true);
  }

  function openEditModal(user) {
    setEditingUser(user);
    setForm({
      name: user.name || '',
      email: user.email,
      password: '',
      role: user.role,
      employeeId: user.employeeId ? String(user.employeeId) : '',
    });
    setIsModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        email: form.email,
        role: form.role,
        employeeId: form.employeeId ? Number(form.employeeId) : null,
      };
      if (form.password) {
        payload.password = form.password;
      }

      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, payload);
      } else {
        if (!form.password) {
          alert('Password is required for new accounts.');
          return;
        }
        await api.post('/users', payload);
      }

      setIsModalOpen(false);
      await fetchData();
    } catch (err) {
      alert(err.message || 'Operation failed');
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Are you sure you want to deactivate/delete this user?')) return;
    try {
      await api.delete(`/users/${id}`);
      await fetchData();
    } catch (err) {
      alert(err.message || 'Failed to delete user');
    }
  }

  const roleColors = {
    ADMIN: 'bg-rose-100 text-rose-800 border-rose-200 font-bold',
    HR_MANAGER: 'bg-purple-100 text-purple-800 border-purple-200',
    HR_PAYROLL_MANAGER: 'bg-teal-100 text-teal-800 border-teal-200 font-semibold',
    HR_PAYROLL_USER: 'bg-blue-100 text-blue-800 border-blue-200',
    EMPLOYEE: 'bg-slate-100 text-slate-800 border-slate-200',
  };

  const filteredUsers = users.filter((u) => {
    const q = searchTerm.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      (u.employee?.email && u.employee.email.toLowerCase().includes(q)) ||
      (u.employee?.name && u.employee.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-12">
      <ControlPanel
        title="Users & Access Control"
        subtitle="Role-Based Authentication & Permissions"
        breadcrumbs={[
          { label: 'Settings' },
          { label: 'Users & Access Control' },
        ]}
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
        onSearchChange={setSearchTerm}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Intro banner */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded bg-purple-50 border border-purple-200 text-[#714B67]">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 text-sm">
                System Access & Role Assignments
              </h2>
              <p className="text-xs text-slate-500">
                Manage operational credentials and link user accounts to employee profiles for self-service and payroll governance.
              </p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Total Accounts</span>
            <span className="text-xl font-bold text-slate-800">{users.length}</span>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[650px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500 tracking-wider">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Linked Employee</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      Loading users...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      No matching user accounts found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const empName = u.employee ? `${u.employee.firstName} ${u.employee.lastName}` : null;
                    return (
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
                          <span className={`text-xs px-2.5 py-0.5 rounded border font-medium ${roleColors[u.role] || 'bg-slate-100'}`}>
                            {u.role.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs">
                          {empName ? (
                            <span className="font-medium text-slate-800">
                              {empName} <span className="text-slate-400 font-mono">({u.employee.employeeCode})</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">No employee profile linked</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-600">
                          {u.employee?.department?.name || '—'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
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
                            {u.id !== currentUser?.id && (
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
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* User Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              {editingUser ? `Edit User: ${editingUser.name || editingUser.email}` : 'Create New User'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                />
              </div>

              <div>
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

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  {editingUser ? 'New Password (leave blank to keep current)' : 'Password *'}
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

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">System Role *</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                >
                  <option value="ADMIN">ADMIN (Full System Configuration)</option>
                  <option value="HR_MANAGER">HR MANAGER (Employees, Leaves, Attendance)</option>
                  <option value="HR_PAYROLL_MANAGER">HR PAYROLL MANAGER (Full Payroll Approval & Payruns)</option>
                  <option value="HR_PAYROLL_USER">HR PAYROLL USER (Draft Payruns & Slips)</option>
                  <option value="EMPLOYEE">EMPLOYEE (Self-Service View Only)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Link to Employee Profile</label>
                <select
                  value={form.employeeId}
                  onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                >
                  <option value="">-- No Linked Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.employeeId} - {emp.department?.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-odoo-primary px-4 py-2"
                >
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
