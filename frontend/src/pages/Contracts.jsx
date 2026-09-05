import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { FileText, Plus, CheckCircle, Clock, Calendar, AlertCircle, X, ArrowRight, User, DollarSign, Shield, Info, Layers } from 'lucide-react';
import api from '../api/client';
import ControlPanel from '../components/ControlPanel';
import { formatDateDMY } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';

export default function Contracts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: routeContractId } = useParams();
  const [searchParams] = useSearchParams();
  const employeeIdParam = searchParams.get('employeeId');

  const canCreateContract = ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'].includes(user?.role);

  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [employees, setEmployees] = useState([]);
  const [structures, setStructures] = useState([]);
  const [selectedContract, setSelectedContract] = useState(null);

  // Create Modal
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    employeeId: employeeIdParam || '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    wage: '',
    salaryStructureId: '',
    notes: '',
  });

  useEffect(() => {
    fetchContracts();
    fetchMetadata();
  }, [employeeIdParam]);

  async function fetchContracts() {
    setLoading(true);
    try {
      const params = {};
      if (employeeIdParam) params.employeeId = employeeIdParam;
      const res = await api.get('/contracts', { params });
      setContracts(res.data);
      if (routeContractId) {
        const matched = res.data.find(c => String(c.id) === String(routeContractId));
        if (matched) setSelectedContract(matched);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchMetadata() {
    try {
      const [empRes, structRes] = await Promise.all([
        api.get('/employees'),
        api.get('/salary/structures'),
      ]);
      setEmployees(empRes.data);
      setStructures(structRes.data);
      if (structRes.data.length > 0) {
        setFormData((prev) => ({ ...prev, salaryStructureId: structRes.data[0].id }));
      }
    } catch (err) {
      console.error(err);
    }
  }

  function handleOpenContract(contract) {
    setSelectedContract(contract);
    navigate(`/contracts/${contract.id}`);
  }

  function handleCloseDetail() {
    setSelectedContract(null);
    navigate('/contracts');
  }

  async function handleCreateContract(e) {
    e.preventDefault();
    if (!canCreateContract) {
      alert('Access Denied: Only HR Manager and Admin can create employment contracts.');
      return;
    }
    try {
      await api.post('/contracts', formData);
      setShowModal(false);
      setFormData({
        employeeId: '',
        startDate: new Date().toISOString().slice(0, 10),
        endDate: '',
        wage: '',
        salaryStructureId: structures[0]?.id || '',
        notes: '',
      });
      fetchContracts();
    } catch (err) {
      alert(err.message || 'Failed to create contract');
    }
  }

  const filteredContracts = contracts.filter((c) => {
    const q = search.toLowerCase();
    const matchesSearch =
      c.employee?.name?.toLowerCase().includes(q) ||
      c.employee?.employeeId?.toLowerCase().includes(q) ||
      c.salaryStructure?.name?.toLowerCase().includes(q);
    const matchesStatus = !statusFilter || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-12">
      <ControlPanel
        title="Contracts"
        subtitle="Employment Terms & Period Wage Allocation"
        breadcrumbs={[{ label: 'Contracts', href: '/contracts' }, ...(selectedContract ? [{ label: `CON/2026/${String(selectedContract.id).padStart(4, '0')}` }] : [])]}
        actions={
          canCreateContract ? (
            <button onClick={() => setShowModal(true)} className="btn-primary text-xs">
              <Plus className="w-3.5 h-3.5" />
              <span>New Contract</span>
            </button>
          ) : null
        }
        searchQuery={search}
        onSearchChange={setSearch}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-4">
        
        {/* Filter bar */}
        <div className="flex items-center gap-3 text-xs bg-white p-3 rounded-lg border border-slate-200">
          <span className="font-semibold text-slate-600">Filter Status:</span>
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1 rounded transition-colors ${!statusFilter ? 'bg-[#714B67] text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            All Contracts ({contracts.length})
          </button>
          <button
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1 rounded transition-colors ${statusFilter === 'ACTIVE' ? 'bg-[#00A09D] text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            Running / Active ({contracts.filter(c => c.status === 'ACTIVE').length})
          </button>
          <button
            onClick={() => setStatusFilter('EXPIRED')}
            className={`px-3 py-1 rounded transition-colors ${statusFilter === 'EXPIRED' ? 'bg-slate-700 text-white font-semibold' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            Expired / Historical ({contracts.filter(c => c.status === 'EXPIRED').length})
          </button>
        </div>

        {/* Contracts Table */}
        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Contract Ref</th>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Start Date</th>
                <th className="px-4 py-3">End Date</th>
                <th className="px-4 py-3">Wage / Month</th>
                <th className="px-4 py-3">Salary Structure</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredContracts.map((c) => (
                <tr 
                  key={c.id} 
                  onClick={() => handleOpenContract(c)}
                  className="hover:bg-purple-50/50 cursor-pointer transition-colors group"
                >
                  <td className="px-4 py-3 font-mono font-semibold text-[#714B67] group-hover:underline">
                    CON/2026/{String(c.id).padStart(4, '0')}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {c.employee?.name} <span className="text-[11px] text-slate-400">({c.employee?.employeeId})</span>
                  </td>
                  <td className="px-4 py-3">{c.employee?.department?.name || 'N/A'}</td>
                  <td className="px-4 py-3 font-mono">{formatDateDMY(c.startDate)}</td>
                  <td className="px-4 py-3 font-mono">
                    {c.endDate ? (
                      formatDateDMY(c.endDate)
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Ongoing
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-teal-700 text-sm">
                    ₹{c.wage?.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.salaryStructure?.name}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${
                      c.status === 'ACTIVE'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border-slate-300'
                    }`}>
                      {c.status === 'ACTIVE' ? 'Running' : 'Expired'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Automatic Expiration Rule Banner */}
        <div className="bg-purple-50/50 border border-purple-200 p-4 rounded-lg flex items-start gap-3 text-xs text-slate-700">
          <FileText className="w-5 h-5 text-[#714B67] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-[#714B67]">Automatic Contract Expiration Flow:</span> When an employee has an <b>Ongoing</b> contract and a new contract is issued (e.g. from today or a future date), the engine <b>automatically sets the previous contract's end date</b> to the day before the new contract starts and marks it as <b>Expired</b>. This ensures deterministic, non-overlapping wage calculations for every payrun.
          </div>
        </div>

      </div>

      {/* CONTRACT DETAILS MODAL */}
      {selectedContract && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-slate-900 to-[#714B67] text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <FileText className="w-5 h-5 text-teal-300" />
                </div>
                <div>
                  <h3 className="font-bold text-base tracking-wide">
                    CON/2026/{String(selectedContract.id).padStart(4, '0')}
                  </h3>
                  <p className="text-xs text-purple-200">
                    Employment Contract — {selectedContract.employee?.name} ({selectedContract.employee?.employeeId})
                  </p>
                </div>
              </div>
              <button 
                onClick={handleCloseDetail}
                className="p-1.5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 text-xs text-slate-700 max-h-[80vh] overflow-y-auto">
              
              {/* Top Meta Info Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg">
                  <span className="text-[11px] text-slate-500 font-medium block mb-1">Contract Status</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-full border ${
                    selectedContract.status === 'ACTIVE'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border-slate-300'
                  }`}>
                    <CheckCircle className="w-3.5 h-3.5" />
                    {selectedContract.status === 'ACTIVE' ? 'Running / Active' : 'Expired'}
                  </span>
                </div>

                <div className="bg-teal-50/50 border border-teal-200 p-3 rounded-lg">
                  <span className="text-[11px] text-teal-700 font-medium block mb-1">Monthly Base Wage</span>
                  <span className="text-lg font-bold text-teal-800 font-mono">
                    ₹{selectedContract.wage?.toLocaleString()}
                  </span>
                </div>

                <div className="bg-purple-50/50 border border-purple-200 p-3 rounded-lg">
                  <span className="text-[11px] text-[#714B67] font-medium block mb-1">Salary Structure</span>
                  <span className="text-xs font-bold text-[#714B67] truncate block">
                    {selectedContract.salaryStructure?.name || 'Standard Structure'}
                  </span>
                </div>
              </div>

              {/* Employee & Timeline Information */}
              <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
                <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2 flex items-center gap-2 text-xs">
                  <User className="w-4 h-4 text-[#714B67]" />
                  Employee & Contract Terms
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Employee Name</span>
                    <span className="font-semibold text-slate-900 text-sm">{selectedContract.employee?.name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Department</span>
                    <span className="font-semibold text-slate-800">{selectedContract.employee?.department?.name || 'Unassigned'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Effective Start Date</span>
                    <span className="font-mono font-medium text-slate-800">{formatDateDMY(selectedContract.startDate)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">Effective End Date</span>
                    <span className="font-mono font-medium text-slate-800">
                      {selectedContract.endDate ? formatDateDMY(selectedContract.endDate) : 'Ongoing (Open-ended)'}
                    </span>
                  </div>
                </div>

                {selectedContract.notes && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-slate-400 block text-[11px] mb-0.5">Contract Notes & Provisions</span>
                    <p className="text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200 text-xs italic">
                      "{selectedContract.notes}"
                    </p>
                  </div>
                )}
              </div>

              {/* Salary Structure Rules Breakdown Preview */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                <h4 className="font-bold text-slate-900 flex items-center gap-2 text-xs">
                  <Layers className="w-4 h-4 text-[#00A09D]" />
                  Salary Computation Breakdown Preview
                </h4>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-white p-2.5 rounded border border-slate-200">
                    <span className="text-slate-400 block text-[10px]">BASIC (50%)</span>
                    <span className="font-mono font-semibold text-slate-800">
                      ₹{Math.round((selectedContract.wage || 0) * 0.5).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded border border-slate-200">
                    <span className="text-slate-400 block text-[10px]">HRA (50% Basic)</span>
                    <span className="font-mono font-semibold text-slate-800">
                      ₹{Math.round((selectedContract.wage || 0) * 0.25).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded border border-slate-200">
                    <span className="text-slate-400 block text-[10px]">STANDARD ALLOWANCE</span>
                    <span className="font-mono font-semibold text-slate-800">
                      ₹{Math.round((selectedContract.wage || 0) * 0.25).toLocaleString()}
                    </span>
                  </div>
                  <div className="bg-emerald-100/60 p-2.5 rounded border border-emerald-200">
                    <span className="text-emerald-800 font-semibold block text-[10px]">ESTIMATED GROSS</span>
                    <span className="font-mono font-bold text-emerald-900">
                      ₹{selectedContract.wage?.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={handleCloseDetail}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-lg transition-colors"
              >
                Close Contract View
              </button>
            </div>

          </div>
        </div>
      )}

      {/* CREATE CONTRACT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xl max-w-lg w-full">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-sm text-[#2C3E50]">Issue New Employment Contract</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateContract} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Employee *</label>
                <select
                  required
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                >
                  <option value="">Select Employee</option>
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.name} ({e.employeeId})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">End Date (Optional)</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Monthly Wage (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 60000"
                    value={formData.wage}
                    onChange={(e) => setFormData({ ...formData, wage: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Salary Structure *</label>
                  <select
                    required
                    value={formData.salaryStructureId}
                    onChange={(e) => setFormData({ ...formData, salaryStructureId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  >
                    {structures.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Notes / Terms</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Standard permanent employment contract"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                />
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-outline text-xs"
                >
                  Discard
                </button>
                <button type="submit" className="btn-primary text-xs">
                  Create Contract
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
