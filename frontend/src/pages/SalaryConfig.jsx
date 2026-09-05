import React, { useState, useEffect } from 'react';
import { 
  Sliders, Plus, Edit2, CheckCircle2, Calculator, Layers, ArrowUpDown, 
  HelpCircle, Check, X 
} from 'lucide-react';
import api from '../api/client';
import ControlPanel from '../components/ControlPanel';
import { useAuth } from '../context/AuthContext';

export default function SalaryConfig() {
  const { user } = useAuth();
  const [structures, setStructures] = useState([]);
  const [selectedStructureId, setSelectedStructureId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  // Forms
  const [structureForm, setStructureForm] = useState({ name: '', description: '' });
  const [ruleForm, setRuleForm] = useState({
    name: '',
    code: '',
    category: 'BASIC',
    sequence: 10,
    calculationType: 'FORMULA',
    valueExpression: '0.5 * WAGE',
    active: true,
  });

  const canEdit = ['ADMIN', 'HR_PAYROLL_MANAGER'].includes(user?.role);

  useEffect(() => {
    fetchStructures();
  }, []);

  async function fetchStructures() {
    setLoading(true);
    try {
      const res = await api.get('/salary/structures');
      setStructures(res.data);
      if (res.data.length > 0 && !selectedStructureId) {
        setSelectedStructureId(res.data[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch structures:', err);
    } finally {
      setLoading(false);
    }
  }

  const activeStructure = structures.find((s) => s.id === selectedStructureId) || structures[0];
  const sortedRules = activeStructure?.salaryRules 
    ? [...activeStructure.salaryRules].sort((a, b) => a.sequence - b.sequence)
    : [];

  async function handleCreateStructure(e) {
    e.preventDefault();
    try {
      await api.post('/salary/structures', structureForm);
      setIsStructureModalOpen(false);
      setStructureForm({ name: '', description: '' });
      await fetchStructures();
    } catch (err) {
      alert(err.message || 'Failed to create structure');
    }
  }

  function openNewRuleModal() {
    setEditingRule(null);
    const nextSeq = sortedRules.length > 0 ? (Math.max(...sortedRules.map(r => r.sequence)) + 10) : 10;
    setRuleForm({
      name: '',
      code: '',
      category: 'ALLOWANCE',
      sequence: nextSeq,
      calculationType: 'FORMULA',
      valueExpression: '0.1 * BASIC',
      active: true,
    });
    setIsRuleModalOpen(true);
  }

  function openEditRuleModal(rule) {
    setEditingRule(rule);
    setRuleForm({
      name: rule.name,
      code: rule.code,
      category: rule.category,
      sequence: rule.sequence,
      calculationType: rule.calculationType,
      valueExpression: rule.valueExpression,
      active: rule.active,
    });
    setIsRuleModalOpen(true);
  }

  async function handleSaveRule(e) {
    e.preventDefault();
    try {
      if (editingRule) {
        await api.put(`/salary/rules/${editingRule.id}`, ruleForm);
      } else {
        await api.post('/salary/rules', {
          ...ruleForm,
          salaryStructureId: activeStructure.id,
        });
      }
      setIsRuleModalOpen(false);
      await fetchStructures();
    } catch (err) {
      alert(err.message || 'Failed to save rule');
    }
  }

  const categoryBadges = {
    BASIC: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    ALLOWANCE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    GROSS: 'bg-blue-100 text-blue-800 border-blue-200',
    DEDUCTION: 'bg-rose-100 text-rose-800 border-rose-200',
    NET: 'bg-purple-100 text-purple-800 border-purple-200 font-bold',
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-12">
      <ControlPanel
        title="Salary Structures & Sequential Rules"
        subtitle="Deterministic Mathematical Computation Matrix"
        breadcrumbs={[
          { label: 'Payroll' },
          { label: 'Configuration' },
          { label: 'Salary Structures & Rules' },
        ]}
        actions={
          canEdit && (
            <div className="flex gap-2">
              <button
                onClick={() => setIsStructureModalOpen(true)}
                className="btn-odoo-secondary text-xs flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>New Structure</span>
              </button>
              <button
                onClick={openNewRuleModal}
                disabled={!activeStructure}
                className="btn-odoo-primary text-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Salary Rule</span>
              </button>
            </div>
          )
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Structure Selector Bar */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Active Salary Structure
              </h2>
              <div className="flex items-center gap-3 mt-1.5">
                <select
                  value={selectedStructureId || ''}
                  onChange={(e) => setSelectedStructureId(Number(e.target.value))}
                  className="px-3 py-1.5 border border-slate-300 rounded font-medium text-slate-800 text-sm focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                >
                  {structures.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.salaryRules?.length || 0} Rules)
                    </option>
                  ))}
                </select>
                <span className="text-xs text-slate-500">
                  {activeStructure?.description || 'Standard sequential computation matrix'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs bg-slate-50 border border-slate-200 rounded px-3 py-2 text-slate-600">
              <Calculator className="w-4 h-4 text-[#00A09D]" />
              <span>
                Engine computes rules strictly in ascending <strong>Sequence</strong> order.
              </span>
            </div>
          </div>
        </div>

        {/* Salary Rules Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="font-semibold text-slate-800 text-base">
                Sequential Computation Rules
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Rules execute from lowest sequence to highest. Later rules can reference earlier rule codes (e.g. BASIC, HRA).
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-200/70 text-slate-700 rounded-full">
              {sortedRules.length} Configured Rules
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500 tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-20 text-center">Seq</th>
                  <th className="py-3 px-4">Rule Name</th>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Computation Type</th>
                  <th className="py-3 px-4">Expression / Formula</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  {canEdit && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400">
                      Loading rules...
                    </td>
                  </tr>
                ) : sortedRules.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-slate-400">
                      No rules defined for this structure.
                    </td>
                  </tr>
                ) : (
                  sortedRules.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-500 bg-slate-50/50">
                        {r.sequence}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {r.name}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 border border-slate-200 rounded font-semibold text-slate-700">
                          {r.code}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[11px] px-2 py-0.5 rounded border font-medium ${categoryBadges[r.category] || 'bg-slate-100'}`}>
                          {r.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600">
                        {r.calculationType}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-[#714B67] font-semibold bg-slate-50/30">
                        {r.valueExpression}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block w-2 h-2 rounded-full ${r.active ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      </td>
                      {canEdit && (
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => openEditRuleModal(r)}
                            className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-800 transition-colors"
                            title="Edit Rule"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Formula Reference Guide */}
        <div className="mt-6 bg-indigo-50/60 border border-indigo-100 rounded-lg p-4 text-xs text-indigo-900">
          <h4 className="font-bold mb-1.5 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-indigo-600" />
            Deterministic Formula Syntax Reference
          </h4>
          <p className="mb-2 text-indigo-800">
            Expressions support standard arithmetic (<code className="bg-indigo-100 px-1 py-0.5 rounded font-mono">+ - * /</code>) and variable replacements:
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px]">
            <li className="bg-white/80 p-2 rounded border border-indigo-100">
              <strong>WAGE</strong>: Employee contract monthly base wage
            </li>
            <li className="bg-white/80 p-2 rounded border border-indigo-100">
              <strong>BASIC</strong>: Computed basic component
            </li>
            <li className="bg-white/80 p-2 rounded border border-indigo-100">
              <strong>GROSS</strong>: Total earnings sum before deductions
            </li>
          </ul>
        </div>
      </div>

      {/* New Structure Modal */}
      {isStructureModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">Create Salary Structure</h3>
            <form onSubmit={handleCreateStructure} className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Structure Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Executive Management Structure"
                  value={structureForm.name}
                  onChange={(e) => setStructureForm({ ...structureForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Optional details"
                  value={structureForm.description}
                  onChange={(e) => setStructureForm({ ...structureForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsStructureModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-odoo-primary px-4 py-2"
                >
                  Create Structure
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Rule Modal */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              {editingRule ? `Edit Rule: ${editingRule.name}` : 'Add Salary Rule'}
            </h3>
            <form onSubmit={handleSaveRule} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Rule Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. House Rent Allowance"
                    value={ruleForm.name}
                    onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Code * (Uppercase)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HRA"
                    value={ruleForm.code}
                    onChange={(e) => setRuleForm({ ...ruleForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-300 rounded font-mono focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Category *</label>
                  <select
                    value={ruleForm.category}
                    onChange={(e) => setRuleForm({ ...ruleForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  >
                    <option value="BASIC">BASIC</option>
                    <option value="ALLOWANCE">ALLOWANCE</option>
                    <option value="GROSS">GROSS</option>
                    <option value="DEDUCTION">DEDUCTION</option>
                    <option value="NET">NET</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Sequence *</label>
                  <input
                    type="number"
                    required
                    value={ruleForm.sequence}
                    onChange={(e) => setRuleForm({ ...ruleForm, sequence: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Calc Type *</label>
                  <select
                    value={ruleForm.calculationType}
                    onChange={(e) => setRuleForm({ ...ruleForm, calculationType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  >
                    <option value="FIXED">FIXED</option>
                    <option value="PERCENTAGE">PERCENTAGE</option>
                    <option value="FORMULA">FORMULA</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Expression / Value Formula *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 0.5 * WAGE or 1800 or BASIC + HRA"
                  value={ruleForm.valueExpression}
                  onChange={(e) => setRuleForm({ ...ruleForm, valueExpression: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded font-mono text-xs focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Formula can use constants, WAGE, or any prior rule code.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ruleActive"
                  checked={ruleForm.active}
                  onChange={(e) => setRuleForm({ ...ruleForm, active: e.target.checked })}
                  className="rounded border-slate-300 text-[#714B67] focus:ring-[#714B67]"
                />
                <label htmlFor="ruleActive" className="text-xs text-slate-700">Active Rule</label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRuleModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-odoo-primary px-4 py-2"
                >
                  {editingRule ? 'Update Rule' : 'Save Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
