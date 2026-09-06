import React, { useState, useEffect } from 'react';
import { 
  Shield, Search, RefreshCw, Eye, Calendar, 
  ArrowRight, FileCode, CheckCircle2 
} from 'lucide-react';
import api from '../api/client';
import ControlPanel from '../components/ControlPanel';
import Pagination from '../components/Pagination';
import { useDebounce } from '../hooks/useDebounce';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 50, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [entityFilter, setEntityFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => { fetchLogs(1); }, [entityFilter, debouncedSearch]);

  const formatValue = (val) => {
    if (!val) return 'None';
    if (typeof val === 'object') return JSON.stringify(val, null, 2);
    try {
      const parsed = JSON.parse(val);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return String(val);
    }
  };

  async function fetchLogs(page = pagination.page) {
    setLoading(true);
    try {
      const params = { page, limit: 50 };
      if (entityFilter) params.entityName = entityFilter;
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      const res = await api.get('/audit', { params });
      const envelope = res.data;
      const list = Array.isArray(envelope.data) ? envelope.data : Array.isArray(envelope) ? envelope : [];
      setLogs(list);
      if (envelope.total !== undefined) {
        setPagination({ total: envelope.total, page: envelope.page, limit: envelope.limit, totalPages: envelope.totalPages });
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }

  // Logs are already filtered server-side
  const filteredLogs = logs;

  const actionColors = {
    PAYRUN_COMPUTED: 'bg-teal-100 text-teal-800 border-teal-200',
    PAYRUN_VALIDATED: 'bg-emerald-100 text-emerald-800 border-emerald-200 font-semibold',
    PAYRUN_PAID: 'bg-purple-100 text-purple-800 border-purple-200 font-bold',
    ATTENDANCE_CORRECTED: 'bg-amber-100 text-amber-800 border-amber-200',
    TIME_OFF_APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    TIME_OFF_REJECTED: 'bg-rose-100 text-rose-800 border-rose-200',
    EMPLOYEE_CREATED: 'bg-blue-100 text-blue-800 border-blue-200',
    CONTRACT_CREATED: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-12">
      <ControlPanel
        title="System Audit Trail"
        subtitle="Immutable Event History & Compliance"
        breadcrumbs={[
          { label: 'Security' },
          { label: 'Immutable Audit Trail' },
        ]}
        actions={
          <button
            onClick={fetchLogs}
            className="btn-odoo-secondary text-xs flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Logs</span>
          </button>
        }
        searchPlaceholder="Filter by action, entity, or actor..."
        searchQuery={searchTerm}
        onSearchChange={setSearchTerm}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Header Summary & Filter Bar */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded bg-slate-100 border border-slate-200 text-slate-700">
              <Shield className="w-6 h-6 text-[#714B67]" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900 text-sm">
                Compliance & System Audit Trail
              </h2>
              <p className="text-xs text-slate-500">
                Tamper-proof record of all payroll computations, manual attendance overrides, and contractual lifecycle events.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-600 font-medium">Filter Entity:</label>
              <select
                value={entityFilter}
                onChange={(e) => setEntityFilter(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#714B67]"
              >
                <option value="">All Entities</option>
                <option value="Payrun">Payrun</option>
                <option value="Attendance">Attendance</option>
                <option value="TimeOffRequest">TimeOffRequest</option>
                <option value="Employee">Employee</option>
                <option value="Contract">Contract</option>
                <option value="SalaryStructure">SalaryStructure</option>
                <option value="SalaryRule">SalaryRule</option>
                <option value="User">User</option>
              </select>
            </div>
            <Pagination
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              limit={pagination.limit}
              onPageChange={(p) => fetchLogs(p)}
            />
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase text-slate-500 tracking-wider">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Entity</th>
                  <th className="py-3 px-4">Entity ID</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      Loading audit events...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      No audit events recorded.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const badgeClass = actionColors[log.action] || 'bg-slate-100 text-slate-800 border-slate-200';
                    const dateStr = new Date(log.timestamp).toLocaleString();
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono text-xs text-slate-500 whitespace-nowrap">
                          {dateStr}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-xs px-2.5 py-0.5 rounded border font-mono ${badgeClass}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs font-medium text-slate-800">
                          {log.entityName || '—'}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-slate-500">
                          {log.entityId ? `#${log.entityId}` : '—'}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          {log.user ? (
                            <div>
                              <div className="font-medium text-slate-900">{log.user.name || log.user.email}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{log.user.role}</div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">SYSTEM</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="p-1.5 hover:bg-slate-100 rounded text-slate-500 hover:text-slate-900 transition-colors"
                            title="Inspect Change Values"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
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

      {/* Detail Diff Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Audit Event: {selectedLog.action}</span>
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Entity: {selectedLog.entityName} #{selectedLog.entityId} • {new Date(selectedLog.timestamp).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-rose-50/50 border border-rose-100 rounded p-3">
                <h4 className="font-semibold text-rose-800 mb-2 uppercase tracking-wide text-[11px]">
                  Previous State
                </h4>
                <pre className="font-mono bg-white p-2.5 rounded border border-rose-200 text-rose-900 overflow-x-auto whitespace-pre-wrap max-h-60 text-[11px]">
                  {formatValue(selectedLog.previousValue)}
                </pre>
              </div>

              <div className="bg-emerald-50/50 border border-emerald-100 rounded p-3">
                <h4 className="font-semibold text-emerald-800 mb-2 uppercase tracking-wide text-[11px]">
                  New State / Changes
                </h4>
                <pre className="font-mono bg-white p-2.5 rounded border border-emerald-200 text-emerald-900 overflow-x-auto whitespace-pre-wrap max-h-60 text-[11px]">
                  {formatValue(selectedLog.newValue)}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-4 mt-4 border-t border-slate-100">
              <button
                onClick={() => setSelectedLog(null)}
                className="btn-odoo-secondary px-4 py-2 text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
