import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  DollarSign, Plus, Play, CheckCircle2, AlertTriangle,
  Send, FileDown, Check, ArrowLeft, X, Eye, ShieldAlert,
  RefreshCw, AlertCircle, Copy, FileText, Layers, Search,
  Filter, ChevronLeft, ChevronRight, Hash, Building2
} from 'lucide-react';
import api from '../api/client';
import ControlPanel from '../components/ControlPanel';
import { useAuth } from '../context/AuthContext';
import { formatPeriodRange } from '../utils/formatters';

export default function Payruns() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id: routePayrunId } = useParams();

  const [payruns, setPayruns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayrun, setSelectedPayrun] = useState(null);
  const [processingAction, setProcessingAction] = useState(null);
  const [feedbackToast, setFeedbackToast] = useState(null);
  const [errorInfo, setErrorInfo] = useState(null);
  const [copied, setCopied] = useState(false);

  // Tab & Payslip Explorer state for default /payroll view
  const [activeTab, setActiveTab] = useState('batches'); // 'batches' | 'payslips'
  const [allPayslips, setAllPayslips] = useState([]);
  const [payslipsLoading, setPayslipsLoading] = useState(false);
  const [slipSearch, setSlipSearch] = useState('');
  const [batchFilter, setBatchFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [slipPage, setSlipPage] = useState(1);
  const slipsPerPage = 20;

  // Two-step Wizard State
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [structures, setStructures] = useState([]);
  const [wizardForm, setWizardForm] = useState({
    name: 'Payrun - September 2026',
    salaryStructureId: '',
    periodStart: '2026-09-01',
    periodEnd: '2026-09-30',
  });
  const [eligibleEmployees, setEligibleEmployees] = useState([]);
  const [selectedEmpIds, setSelectedEmpIds] = useState([]);
  const [wizardLoading, setWizardLoading] = useState(false);

  // Payslip detail modal
  const [viewPayslip, setViewPayslip] = useState(null);
  const [sendingSlipId, setSendingSlipId] = useState(null);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PAID':
        return 'bg-emerald-50 text-emerald-700 border-emerald-300';
      case 'VALIDATED':
        return 'bg-teal-50 text-[#00A09D] border-[#00A09D]/30';
      case 'COMPUTED':
        return 'bg-purple-50 text-[#714B67] border-[#714B67]/30';
      case 'WARNING':
        return 'bg-amber-50 text-amber-700 border-amber-300';
      case 'CANCELLED':
        return 'bg-rose-50 text-rose-700 border-rose-300';
      case 'DRAFT':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  useEffect(() => {
    fetchPayruns();
    fetchStructures();
    fetchAllPayslips();
  }, []);

  useEffect(() => {
    if (routePayrunId) {
      loadPayrunDetail(routePayrunId);
    } else {
      setSelectedPayrun(null);
    }
  }, [routePayrunId]);

  async function fetchPayruns() {
    setLoading(true);
    try {
      const res = await api.get('/payruns');
      setPayruns(res.data);
      if (routePayrunId) {
        loadPayrunDetail(routePayrunId);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadPayrunDetail(id) {
    try {
      const res = await api.get(`/payruns/${id}`);
      setSelectedPayrun(res?.data || res);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchStructures() {
    try {
      const res = await api.get('/salary/structures');
      setStructures(res.data);
      if (res.data.length > 0 && !wizardForm.salaryStructureId) {
        setWizardForm((prev) => ({ ...prev, salaryStructureId: res.data[0].id }));
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchAllPayslips() {
    setPayslipsLoading(true);
    try {
      const res = await api.get('/payslips');
      setAllPayslips(res.data || []);
    } catch (err) {
      console.error('[Payslips Fetch Error]:', err);
    } finally {
      setPayslipsLoading(false);
    }
  }

  async function handleOpenSlipDetail(slip) {
    if (slip.payslipLines && slip.payslipLines.length > 0) {
      setViewPayslip(slip);
    } else {
      try {
        const res = await api.get(`/payslips/${slip.id}`);
        setViewPayslip(res.data);
      } catch (err) {
        setViewPayslip(slip);
      }
    }
  }

  function handleOpenPayrun(target) {
    const payrunId = typeof target === 'object' && target !== null ? target.id : target;
    if (payrunId) {
      navigate(`/payroll/${payrunId}`);
    }
  }

  function handleBackToPayruns() {
    setSelectedPayrun(null);
    navigate('/payroll');
  }

  // WIZARD STEP 1 -> STEP 2: Fetch eligible employees
  async function handleWizardContinue(e) {
    e.preventDefault();
    setWizardLoading(true);
    try {
      const res = await api.get('/payruns/eligible-employees', {
        params: {
          salaryStructureId: wizardForm.salaryStructureId,
          periodStart: wizardForm.periodStart,
          periodEnd: wizardForm.periodEnd,
        },
      });
      setEligibleEmployees(res.data);
      // Select all by default
      setSelectedEmpIds(res.data.map((e) => e.id));
      setWizardStep(2);
    } catch (err) {
      alert(err.message || 'Failed to fetch eligible employees');
    } finally {
      setWizardLoading(false);
    }
  }

  // WIZARD STEP 2 -> CREATE PAYRUN
  async function handleCreatePayrun() {
    if (selectedEmpIds.length === 0) {
      alert('Please select at least one employee for the payrun.');
      return;
    }
    setWizardLoading(true);
    try {
      const res = await api.post('/payruns', {
        name: wizardForm.name,
        salaryStructureId: wizardForm.salaryStructureId,
        periodStart: wizardForm.periodStart,
        periodEnd: wizardForm.periodEnd,
        employeeIds: selectedEmpIds,
      });
      setWizardOpen(false);
      setWizardStep(1);
      fetchPayruns();
      // Immediately open the newly created payrun
      handleOpenPayrun(res.data.id);
    } catch (err) {
      alert(err.message || 'Failed to create payrun');
    } finally {
      setWizardLoading(false);
    }
  }

  // PROCESSING ACTIONS
  async function handleCompute() {
    if (!selectedPayrun) return;
    setProcessingAction('computing');
    console.log('[Payroll Engine] Initiating salary computation for payrun:', {
      id: selectedPayrun.id,
      name: selectedPayrun.name,
      status: selectedPayrun.status,
      operator: user?.name,
      role: user?.role
    });

    try {
      const res = await api.post(`/payruns/${selectedPayrun.id}/compute`);
      console.log('[Payroll Engine] Computation successful:', res);
      const computedPayrun = res?.data || res;
      setSelectedPayrun(computedPayrun);
      await fetchPayruns();
      setFeedbackToast({
        type: 'success',
        message: `✓ Computed ${computedPayrun.payslips?.length || 0} payslips! Total Gross: ₹${(computedPayrun.totalGross || 0).toLocaleString()} • Net Disbursed: ₹${(computedPayrun.totalNet || 0).toLocaleString()}`,
      });
      setTimeout(() => setFeedbackToast(null), 4500);
    } catch (err) {
      console.error('[Payroll Engine Compute Error]:', err);
      setErrorInfo({
        action: 'Payrun Computation',
        payrun: { id: selectedPayrun.id, name: selectedPayrun.name, status: selectedPayrun.status },
        user: { name: user?.name, role: user?.role },
        message: err.message || 'Compute failed',
        timestamp: new Date().toISOString(),
        url: window.location.href,
        stack: err.stack || err.toString(),
      });
    } finally {
      setProcessingAction(null);
    }
  }

  async function handleValidate() {
    if (!selectedPayrun) return;
    setProcessingAction('validating');
    console.log('[Payroll Engine] Validating payrun integrity:', {
      id: selectedPayrun.id,
      name: selectedPayrun.name,
    });

    try {
      const res = await api.post(`/payruns/${selectedPayrun.id}/validate`);
      console.log('[Payroll Engine] Validation successful:', res);
      const validatedPayrun = res?.data || res;
      setSelectedPayrun(validatedPayrun);
      await fetchPayruns();
      setFeedbackToast({
        type: 'success',
        message: `✓ Payrun successfully validated! Status moved to VALIDATED. Ready for disbursement.`,
      });
      setTimeout(() => setFeedbackToast(null), 4500);
    } catch (err) {
      console.error('[Payroll Engine Validation Error]:', err);
      setErrorInfo({
        action: 'Payrun Validation',
        payrun: { id: selectedPayrun.id, name: selectedPayrun.name, status: selectedPayrun.status },
        user: { name: user?.name, role: user?.role },
        message: err.message || 'Validation failed',
        timestamp: new Date().toISOString(),
        url: window.location.href,
        stack: err.stack || err.toString(),
      });
    } finally {
      setProcessingAction(null);
    }
  }

  async function handleMarkPaid() {
    if (!selectedPayrun) return;
    if (!confirm('Are you sure you want to mark this payrun as PAID? This will commit the payout and lock records.')) return;
    setProcessingAction('marking_paid');
    console.log('[Payroll Engine] Marking payrun as PAID & locking records:', selectedPayrun.id);

    try {
      const res = await api.post(`/payruns/${selectedPayrun.id}/mark-paid`);
      console.log('[Payroll Engine] Mark Paid successful:', res);
      const paidPayrun = res?.data || res;
      setSelectedPayrun(paidPayrun);
      await fetchPayruns();
      setFeedbackToast({
        type: 'success',
        message: `✓ Payrun marked as PAID! All payslips are finalized and locked.`,
      });
      setTimeout(() => setFeedbackToast(null), 4500);
    } catch (err) {
      console.error('[Payroll Engine Mark Paid Error]:', err);
      setErrorInfo({
        action: 'Payrun Mark Paid',
        payrun: { id: selectedPayrun.id, name: selectedPayrun.name, status: selectedPayrun.status },
        user: { name: user?.name, role: user?.role },
        message: err.message || 'Mark Paid failed',
        timestamp: new Date().toISOString(),
        url: window.location.href,
        stack: err.stack || err.toString(),
      });
    } finally {
      setProcessingAction(null);
    }
  }

  async function handleSendPayslips() {
    if (!selectedPayrun) return;
    setProcessingAction('sending_slips');
    try {
      const res = await api.post('/payslips/bulk-send', { payrunId: selectedPayrun.id });
      setFeedbackToast({
        type: 'success',
        message: res.data.message || '✓ Payslips successfully emailed to all employees!',
      });
      setTimeout(() => setFeedbackToast(null), 4500);
      handleOpenPayrun(selectedPayrun.id);
    } catch (err) {
      console.error('[Payroll Send Payslips Error]:', err);
      setErrorInfo({
        action: 'Bulk Email Payslips',
        payrun: { id: selectedPayrun.id, name: selectedPayrun.name },
        message: err.message || 'Failed to send payslips',
        timestamp: new Date().toISOString(),
        url: window.location.href,
        stack: err.stack || err.toString(),
      });
    } finally {
      setProcessingAction(null);
    }
  }

  function handleCopyError() {
    if (!errorInfo) return;
    navigator.clipboard.writeText(JSON.stringify(errorInfo, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function handleDownloadPDF(payslipId, payslipNumber) {
    try {
      const res = await api.get(`/payslips/${payslipId}/pdf`, { responseType: 'blob' });
      const blob = new Blob([res.data || res], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${payslipNumber || `payslip-${payslipId}`}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('[PDF Download Error]:', err);
      const token = localStorage.getItem('token');
      window.open(`/api/payslips/${payslipId}/pdf?token=${token}`, '_blank');
    }
  }

  async function handleSendSinglePayslip(payslipId, empName) {
    setSendingSlipId(payslipId);
    try {
      const res = await api.post(`/payslips/${payslipId}/send`);
      setFeedbackToast({
        type: 'success',
        message: res.data?.message || `✓ Payslip successfully emailed to ${empName || 'employee'}!`,
      });
      setTimeout(() => setFeedbackToast(null), 4500);
      if (selectedPayrun?.id) {
        handleOpenPayrun(selectedPayrun.id);
      }
    } catch (err) {
      console.error('[Send Single Payslip Error]:', err);
      setErrorInfo({
        action: 'Email Single Payslip',
        payslipId,
        message: err.message || 'Failed to email payslip',
        timestamp: new Date().toISOString(),
        url: window.location.href,
        stack: err.stack || err.toString(),
      });
    } finally {
      setSendingSlipId(null);
    }
  }

  const canCompute = ['ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'].includes(user?.role);
  const canValidate = ['ADMIN', 'HR_PAYROLL_MANAGER'].includes(user?.role);
  const canMarkPaid = ['ADMIN', 'HR_PAYROLL_MANAGER'].includes(user?.role);

  // Overall metrics across all payrun batches
  const metrics = useMemo(() => {
    const totalBatches = payruns.length;
    const totalSlips = allPayslips.length || payruns.reduce((acc, pr) => acc + (pr._count?.payslips || 0), 0);
    const totalGross = payruns.reduce((acc, pr) => acc + (pr.totalGross || 0), 0);
    const totalNet = payruns.reduce((acc, pr) => acc + (pr.totalNet || 0), 0);
    const totalWarnings = payruns.reduce((acc, pr) => acc + (pr._count?.warnings || (pr.warnings?.length || 0)), 0);
    const statusBreakdown = payruns.reduce((acc, pr) => {
      acc[pr.status] = (acc[pr.status] || 0) + 1;
      return acc;
    }, {});
    return { totalBatches, totalSlips, totalGross, totalNet, totalWarnings, statusBreakdown };
  }, [payruns, allPayslips]);

  // Filtered and paginated payslips for the "All Generated Payslips" view
  const filteredPayslips = useMemo(() => {
    return allPayslips.filter((slip) => {
      if (slipSearch.trim()) {
        const q = slipSearch.toLowerCase().trim();
        const matchName = slip.employee?.name?.toLowerCase().includes(q);
        const matchId = slip.employee?.employeeId?.toLowerCase().includes(q);
        const matchSlipNum = slip.payslipNumber?.toLowerCase().includes(q);
        const matchDept = slip.employee?.department?.name?.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchSlipNum && !matchDept) return false;
      }
      if (batchFilter !== 'ALL' && String(slip.payrunId) !== String(batchFilter)) {
        return false;
      }
      if (statusFilter !== 'ALL' && slip.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [allPayslips, slipSearch, batchFilter, statusFilter]);

  const totalFilteredPages = Math.ceil(filteredPayslips.length / slipsPerPage) || 1;
  const paginatedPayslips = useMemo(() => {
    const start = (slipPage - 1) * slipsPerPage;
    return filteredPayslips.slice(start, start + slipsPerPage);
  }, [filteredPayslips, slipPage, slipsPerPage]);

  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-12">
      <ControlPanel
        title={selectedPayrun ? selectedPayrun.name : "Payroll Payruns"}
        subtitle={selectedPayrun ? formatPeriodRange(selectedPayrun.periodStart, selectedPayrun.periodEnd) : "Batch Salary Processing & Payslip Generation"}
        breadcrumbs={
          selectedPayrun
            ? [{ label: 'Payruns', link: '#' }, { label: selectedPayrun.name }]
            : [{ label: 'Payruns' }]
        }
        actions={
          selectedPayrun ? (
            <button onClick={handleBackToPayruns} className="btn-outline text-xs">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Payruns</span>
            </button>
          ) : (
            <button onClick={() => { setWizardStep(1); setWizardOpen(true); }} className="btn-primary text-xs">
              <Plus className="w-3.5 h-3.5" />
              <span>New Payrun Wizard</span>
            </button>
          )
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">

        {/* ----------------- PAYRUN PROCESSING SCREEN ----------------- */}
        {selectedPayrun ? (
          <div className="space-y-6">

            {/* Header & Status Ribbon & Action Buttons Bar */}
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-[#2C3E50]">{selectedPayrun.name}</h2>
                  <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border ${selectedPayrun.status === 'PAID'
                      ? 'bg-teal-50 text-[#00A09D] border-[#00A09D]/30'
                      : selectedPayrun.status === 'VALIDATED'
                        ? 'bg-purple-50 text-[#714B67] border-[#714B67]/30'
                        : selectedPayrun.status === 'WARNING'
                          ? 'bg-slate-100 text-[#2C3E50] border-slate-300'
                          : selectedPayrun.status === 'COMPUTED'
                            ? 'bg-purple-50/70 text-[#714B67] border-[#714B67]/20'
                            : 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}>
                    {selectedPayrun.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Structure: <span className="font-semibold text-slate-700">{selectedPayrun.salaryStructure?.name}</span> •
                  Period: <span className="font-mono">{formatPeriodRange(selectedPayrun.periodStart, selectedPayrun.periodEnd)}</span>
                </p>
              </div>

              {/* Status Progression Bar */}
              <div className="flex items-center border border-slate-200 rounded bg-slate-50 p-1 text-[11px] font-semibold text-slate-600">
                <span className={`px-2.5 py-1 rounded ${selectedPayrun.status === 'DRAFT' ? 'bg-white shadow-sm text-[#714B67]' : 'text-slate-400'}`}>
                  1. Draft
                </span>
                <span className="text-slate-300 mx-1">➔</span>
                <span className={`px-2.5 py-1 rounded ${selectedPayrun.status === 'COMPUTED' || selectedPayrun.status === 'WARNING' ? 'bg-white shadow-sm text-[#714B67]' : 'text-slate-400'}`}>
                  2. Computed
                </span>
                <span className="text-slate-300 mx-1">➔</span>
                <span className={`px-2.5 py-1 rounded ${selectedPayrun.status === 'VALIDATED' ? 'bg-white shadow-sm text-[#00A09D]' : 'text-slate-400'}`}>
                  3. Validated
                </span>
                <span className="text-slate-300 mx-1">➔</span>
                <span className={`px-2.5 py-1 rounded ${selectedPayrun.status === 'PAID' ? 'bg-[#00A09D] text-white shadow-sm' : 'text-slate-400'}`}>
                  4. Paid
                </span>
              </div>

              {/* Primary Processing Action Buttons */}
              <div className="flex items-center gap-2">
                {selectedPayrun.status !== 'PAID' && canCompute && (
                  <button
                    onClick={handleCompute}
                    disabled={processingAction !== null}
                    className="btn-secondary text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                    title="Run Sequential Salary Rules Engine"
                  >
                    {processingAction === 'computing' ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00A09D]" />
                        <span>Computing...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current text-[#00A09D]" />
                        <span>{selectedPayrun.status === 'COMPUTED' ? 'Re-Compute' : 'Compute'}</span>
                      </>
                    )}
                  </button>
                )}

                {/* Manager Validate Button or User Notice */}
                {(selectedPayrun.status === 'COMPUTED' || selectedPayrun.status === 'WARNING') && (
                  canValidate ? (
                    <button
                      onClick={handleValidate}
                      disabled={processingAction !== null}
                      className="btn-primary text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm"
                      title="Validate Payroll Integrity and Progress to Payment"
                    >
                      {processingAction === 'validating' ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                          <span>Validating...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5 text-white" />
                          <span>Validate Payrun</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-xs font-semibold shadow-xs" title="Manager approval required">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                      <span>Awaiting Manager Validation</span>
                    </div>
                  )
                )}

                {/* Manager Mark Paid Button or User Notice */}
                {selectedPayrun.status === 'VALIDATED' && (
                  canMarkPaid ? (
                    <button
                      onClick={handleMarkPaid}
                      disabled={processingAction !== null}
                      className="btn-primary text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-sm bg-teal-600 hover:bg-teal-700 text-white"
                      title="Commit Payout & Lock Records"
                    >
                      {processingAction === 'marking_paid' ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                          <span>Processing Payout...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                          <span>Mark as Paid</span>
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-800 border border-teal-200 rounded text-xs font-semibold shadow-xs" title="Ready for manager payment disbursement">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                      <span>Validated — Ready for Manager Disbursement</span>
                    </div>
                  )
                )}

                {selectedPayrun.status === 'PAID' && (
                  <button
                    onClick={handleSendPayslips}
                    disabled={processingAction !== null}
                    className="btn-secondary text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                    title="Bulk Email Printable Payslips"
                  >
                    {processingAction === 'sending_slips' ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00A09D]" />
                        <span>Sending Slips...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 text-[#00A09D]" />
                        <span>Send Payslips</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Warnings Alert Banner if any exist */}
            {selectedPayrun.warnings && selectedPayrun.warnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Payroll Validation Warnings Detected ({selectedPayrun.warnings.length}):</span>
                </div>
                <div className="space-y-1 pl-6">
                  {selectedPayrun.warnings.map((w) => (
                    <div key={w.id} className="text-xs text-amber-900 flex items-center gap-2">
                      <span className="font-semibold uppercase text-[10px] bg-amber-200 px-1.5 py-0.2 rounded">
                        {w.severity}
                      </span>
                      <span>{w.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payrun Financial Totals */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm">
                <span className="text-xs text-slate-500 font-medium">Total Gross Salary</span>
                <div className="text-xl font-bold text-[#2C3E50] mt-1 font-mono">
                  ₹{selectedPayrun.totalGross?.toLocaleString() || 0}
                </div>
              </div>
              <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm">
                <span className="text-xs text-slate-500 font-medium">Total Deductions (PF + Tax)</span>
                <div className="text-xl font-bold text-rose-700 mt-1 font-mono">
                  -₹{selectedPayrun.totalDeductions?.toLocaleString() || 0}
                </div>
              </div>
              <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm">
                <span className="text-xs text-slate-500 font-medium">Total Net Payable</span>
                <div className="text-xl font-bold text-teal-700 mt-1 font-mono">
                  ₹{selectedPayrun.totalNet?.toLocaleString() || 0}
                </div>
              </div>
            </div>

            {/* Payslips Table */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                  Generated Payslips ({selectedPayrun.payslips?.length || 0})
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[750px]">
                  <thead className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-semibold">
                    <tr>
                      <th className="px-4 py-3">Payslip No</th>
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3">Worked / Total</th>
                      <th className="px-4 py-3 font-mono">Gross</th>
                      <th className="px-4 py-3 font-mono">Deductions</th>
                      <th className="px-4 py-3 font-mono font-bold">Net Salary</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {selectedPayrun.payslips?.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono font-semibold text-[#714B67]">
                          {p.payslipNumber}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {p.employee?.name}
                          <span className="ml-1 text-[11px] text-slate-400">({p.employee?.employeeId})</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-600">
                          {p.presentDays} / {p.workingDays}d
                        </td>
                        <td className="px-4 py-3 font-mono">₹{p.grossSalary?.toLocaleString()}</td>
                        <td className="px-4 py-3 font-mono text-rose-600">-₹{p.totalDeductions?.toLocaleString()}</td>
                        <td className="px-4 py-3 font-mono font-bold text-teal-700 text-sm">
                          ₹{p.netSalary?.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${p.status === 'PAID'
                              ? 'bg-teal-50 text-[#00A09D] border-[#00A09D]/30'
                              : 'bg-purple-50 text-[#714B67] border-[#714B67]/30'
                            }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setViewPayslip(p)}
                              className="btn-ghost text-[11px] py-1 px-2"
                              title="View Itemized Breakdown"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Details</span>
                            </button>
                            <button
                              onClick={() => handleDownloadPDF(p.id, p.payslipNumber)}
                              className="btn-outline text-[11px] py-1 px-2"
                              title="Printable PDF"
                            >
                              <FileDown className="w-3.5 h-3.5 text-teal-700" />
                              <span>PDF</span>
                            </button>
                            <button
                              onClick={() => handleSendSinglePayslip(p.id, p.employee?.name)}
                              disabled={sendingSlipId === p.id}
                              className="btn-outline text-[11px] py-1 px-2 text-[#714B67] hover:border-[#714B67]"
                              title="Email Payslip directly to employee"
                            >
                              <Send className={`w-3.5 h-3.5 text-[#714B67] ${sendingSlipId === p.id ? 'animate-pulse' : ''}`} />
                              <span>{sendingSlipId === p.id ? 'Sending...' : 'Email'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        ) : (
          /* ----------------- DEFAULT /PAYROLL VIEW (KPIs, TABS, BATCHES & ALL PAYSLIPS) ----------------- */
          <div className="space-y-6">

            {/* Executive KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Total Payrun Batches</span>
                  <Layers className="w-4 h-4 text-[#714B67]" />
                </div>
                <div className="text-2xl font-bold text-[#2C3E50] mt-1 font-mono">
                  {metrics.totalBatches}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                  <span>9 distinct monthly & incentive runs</span>
                </div>
              </div>

              <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Enterprise Payslips</span>
                  <FileText className="w-4 h-4 text-teal-600" />
                </div>
                <div className="text-2xl font-bold text-[#00A09D] mt-1 font-mono">
                  {metrics.totalSlips.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Across 260 distinct employee records
                </div>
              </div>

              <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Gross Processed</span>
                  <DollarSign className="w-4 h-4 text-slate-600" />
                </div>
                <div className="text-xl font-bold text-[#2C3E50] mt-1 font-mono">
                  ₹{metrics.totalGross.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Cumulative payroll volume
                </div>
              </div>

              <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Net Disbursed</span>
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                </div>
                <div className="text-xl font-bold text-teal-700 mt-1 font-mono">
                  ₹{metrics.totalNet.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Total bank payouts across all runs
                </div>
              </div>
            </div>

            {/* Status Pipeline Ribbon */}
            <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Payroll Lifecycle Pipeline:
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <button
                  onClick={() => { setActiveTab('batches'); }}
                  className="px-2.5 py-1 rounded-full border bg-slate-100 border-slate-300 text-slate-700 font-semibold hover:bg-slate-200 transition-colors"
                >
                  DRAFT: <span className="font-mono font-bold">{metrics.statusBreakdown['DRAFT'] || 0}</span>
                </button>
                <button
                  onClick={() => { setActiveTab('batches'); }}
                  className="px-2.5 py-1 rounded-full border bg-blue-50 border-blue-200 text-blue-700 font-semibold hover:bg-blue-100 transition-colors"
                >
                  COMPUTED: <span className="font-mono font-bold">{metrics.statusBreakdown['COMPUTED'] || 0}</span>
                </button>
                <button
                  onClick={() => { setActiveTab('batches'); }}
                  className="px-2.5 py-1 rounded-full border bg-amber-50 border-amber-300 text-amber-800 font-semibold hover:bg-amber-100 transition-colors"
                >
                  WARNING: <span className="font-mono font-bold">{metrics.statusBreakdown['WARNING'] || 0}</span>
                </button>
                <button
                  onClick={() => { setActiveTab('batches'); }}
                  className="px-2.5 py-1 rounded-full border bg-purple-50 border-[#714B67]/30 text-[#714B67] font-semibold hover:bg-purple-100 transition-colors"
                >
                  VALIDATED: <span className="font-mono font-bold">{metrics.statusBreakdown['VALIDATED'] || 0}</span>
                </button>
                <button
                  onClick={() => { setActiveTab('batches'); }}
                  className="px-2.5 py-1 rounded-full border bg-teal-50 border-[#00A09D]/30 text-[#00A09D] font-semibold hover:bg-teal-100 transition-colors"
                >
                  PAID: <span className="font-mono font-bold">{metrics.statusBreakdown['PAID'] || 0}</span>
                </button>
              </div>
            </div>

            {/* View Mode Navigation Tabs */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
              <div className="flex border-b border-slate-200 bg-slate-50/50 px-4 pt-2 gap-2">
                <button
                  onClick={() => setActiveTab('batches')}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    activeTab === 'batches'
                      ? 'border-[#714B67] text-[#714B67] bg-white rounded-t'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>Payrun Batches</span>
                  <span className={`ml-1.5 px-2 py-0.5 text-[10px] rounded-full font-mono font-bold ${
                    activeTab === 'batches' ? 'bg-[#714B67] text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {payruns.length}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('payslips');
                    if (allPayslips.length === 0) fetchAllPayslips();
                  }}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                    activeTab === 'payslips'
                      ? 'border-[#714B67] text-[#714B67] bg-white rounded-t'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>All Generated Payslips</span>
                      <span className={`ml-1.5 px-2 py-0.5 text-[10px] rounded-full font-mono font-bold ${
                    activeTab === 'payslips' ? 'bg-[#00A09D] text-white' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {allPayslips.length > 0 ? allPayslips.length.toLocaleString() : metrics.totalSlips.toLocaleString()}
                  </span>
                </button>
              </div>

              {/* TAB 1: PAYRUN BATCHES TABLE */}
              {activeTab === 'batches' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[750px]">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="px-4 py-3">Payrun Batch</th>
                        <th className="px-4 py-3">Salary Structure</th>
                        <th className="px-4 py-3">Period</th>
                        <th className="px-4 py-3 text-center">Payslips</th>
                        <th className="px-4 py-3 font-mono">Total Gross</th>
                        <th className="px-4 py-3 font-mono">Total Net Payout</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {payruns.map((pr) => {
                        const slipCount = pr._count?.payslips ?? (pr.payslips?.length || 0);
                        return (
                          <tr key={pr.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-semibold text-[#714B67] text-sm">
                                {pr.name}
                              </div>
                              {pr._count?.warnings > 0 && (
                                <div className="flex items-center gap-1 text-[11px] text-amber-700 mt-0.5">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>{pr._count.warnings} payroll warnings detected</span>
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-600">{pr.salaryStructure?.name}</td>
                            <td className="px-4 py-3 font-mono text-slate-500">
                              {formatPeriodRange(pr.periodStart, pr.periodEnd)}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="inline-flex items-center gap-1.5">
                                <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                  {slipCount} Slips
                                </span>
                                {slipCount > 0 && (
                                  <button
                                    onClick={() => {
                                      setBatchFilter(String(pr.id));
                                      setSlipSearch('');
                                      setSlipPage(1);
                                      setActiveTab('payslips');
                                      if (allPayslips.length === 0) fetchAllPayslips();
                                    }}
                                    className="text-[11px] text-[#00A09D] hover:underline font-semibold flex items-center"
                                    title="View individual payslips for this batch"
                                  >
                                    Explore &rarr;
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono">₹{pr.totalGross?.toLocaleString() || 0}</td>
                            <td className="px-4 py-3 font-mono font-bold text-teal-700 text-sm">
                              ₹{pr.totalNet?.toLocaleString() || 0}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${getStatusBadge(pr.status)}`}>
                                {pr.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                onClick={() => handleOpenPayrun(pr.id)}
                                className="btn-outline text-xs px-2.5 py-1 text-[#714B67] hover:border-[#714B67]"
                              >
                                View Sheet &rarr;
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 2: ALL GENERATED PAYSLIPS DIRECTORY */}
              {activeTab === 'payslips' && (
                <div>
                  {/* Filter & Search Bar */}
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <div className="relative flex-1 max-w-sm">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search employee name, EMP ID, or slip no..."
                          value={slipSearch}
                          onChange={(e) => {
                            setSlipSearch(e.target.value);
                            setSlipPage(1);
                          }}
                          className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                        />
                        {slipSearch && (
                          <button
                            onClick={() => { setSlipSearch(''); setSlipPage(1); }}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                          >
                            ✕
                          </button>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-[11px] text-slate-500 font-medium">Batch:</label>
                        <select
                          value={batchFilter}
                          onChange={(e) => {
                            setBatchFilter(e.target.value);
                            setSlipPage(1);
                          }}
                          className="text-xs bg-white border border-slate-200 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#714B67] max-w-xs flex-1 sm:flex-initial"
                        >
                          <option value="ALL">All Payrun Batches ({allPayslips.length})</option>
                          {payruns.map((pr) => (
                            <option key={pr.id} value={String(pr.id)}>
                              {pr.name} ({pr._count?.payslips ?? 0} slips)
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] text-slate-500 font-medium mr-1">Status:</span>
                      {['ALL', 'PAID', 'VALIDATED', 'COMPUTED', 'DRAFT'].map((st) => (
                        <button
                          key={st}
                          onClick={() => {
                            setStatusFilter(st);
                            setSlipPage(1);
                          }}
                          className={`px-2 py-1 text-[10px] font-bold rounded transition-colors ${
                            statusFilter === st
                              ? 'bg-[#714B67] text-white shadow-xs'
                              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                      <button
                        onClick={fetchAllPayslips}
                        disabled={payslipsLoading}
                        className="btn-ghost text-xs p-1.5 ml-1 text-slate-500 hover:text-slate-700"
                        title="Reload payslips from database"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${payslipsLoading ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Payslips Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[800px]">
                      <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="px-4 py-3">Payslip No</th>
                          <th className="px-4 py-3">Employee</th>
                          <th className="px-4 py-3">Payrun Batch</th>
                          <th className="px-4 py-3 text-center">Worked / Total</th>
                          <th className="px-4 py-3 font-mono">Gross</th>
                          <th className="px-4 py-3 font-mono">Deductions</th>
                          <th className="px-4 py-3 font-mono font-bold">Net Salary</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {payslipsLoading ? (
                          <tr>
                            <td colSpan="9" className="px-4 py-8 text-center text-slate-400">
                              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#714B67]" />
                              <span>Loading itemized payslip directory...</span>
                            </td>
                          </tr>
                        ) : paginatedPayslips.length === 0 ? (
                          <tr>
                            <td colSpan="9" className="px-4 py-8 text-center text-slate-400">
                              <FileText className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                              <span>No payslips match the selected filter criteria.</span>
                            </td>
                          </tr>
                        ) : (
                          paginatedPayslips.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-4 py-3 font-mono font-semibold text-[#714B67]">
                                {p.payslipNumber}
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-slate-900">
                                  {p.employee?.name}
                                  <span className="ml-1.5 text-[11px] font-mono text-slate-400">({p.employee?.employeeId})</span>
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {p.employee?.department?.name || 'General Staff'}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                <span className="font-medium text-slate-800">{p.payrun?.name || 'Standard Run'}</span>
                                <div className="text-[10px] font-mono text-slate-400">
                                  {p.payrun ? formatPeriodRange(p.payrun.periodStart, p.payrun.periodEnd) : ''}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-center font-mono text-slate-600">
                                <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                  {p.presentDays} / {p.workingDays}d
                                </span>
                              </td>
                              <td className="px-4 py-3 font-mono">₹{p.grossSalary?.toLocaleString()}</td>
                              <td className="px-4 py-3 font-mono text-rose-600">-₹{p.totalDeductions?.toLocaleString()}</td>
                              <td className="px-4 py-3 font-mono font-bold text-teal-700 text-sm">
                                ₹{p.netSalary?.toLocaleString()}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                                  p.status === 'PAID'
                                    ? 'bg-teal-50 text-[#00A09D] border-[#00A09D]/30'
                                    : p.status === 'VALIDATED'
                                      ? 'bg-purple-50 text-[#714B67] border-[#714B67]/30'
                                      : p.status === 'COMPUTED'
                                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                                        : 'bg-slate-100 text-slate-700 border-slate-300'
                                }`}>
                                  {p.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    onClick={() => handleOpenSlipDetail(p)}
                                    className="btn-ghost text-[11px] py-1 px-2 hover:bg-slate-200"
                                    title="View Detailed Salary Rules Breakdown"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Details</span>
                                  </button>
                                  <button
                                    onClick={() => handleDownloadPDF(p.id, p.payslipNumber)}
                                    className="btn-outline text-[11px] py-1 px-2 text-teal-700 hover:border-teal-700"
                                    title="Download Printable PDF Payslip"
                                  >
                                    <FileDown className="w-3.5 h-3.5 text-teal-700" />
                                    <span>PDF</span>
                                  </button>
                                  <button
                                    onClick={() => handleSendSinglePayslip(p.id, p.employee?.name)}
                                    disabled={sendingSlipId === p.id}
                                    className="btn-outline text-[11px] py-1 px-2 text-[#714B67] hover:border-[#714B67]"
                                    title="Email Payslip directly to employee"
                                  >
                                    <Send className={`w-3.5 h-3.5 text-[#714B67] ${sendingSlipId === p.id ? 'animate-pulse' : ''}`} />
                                    <span>{sendingSlipId === p.id ? 'Sending...' : 'Email'}</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Footer */}
                  <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
                    <div>
                      Showing <span className="font-semibold text-slate-900">{filteredPayslips.length > 0 ? (slipPage - 1) * slipsPerPage + 1 : 0}</span> to{' '}
                      <span className="font-semibold text-slate-900">{Math.min(slipPage * slipsPerPage, filteredPayslips.length)}</span> of{' '}
                      <span className="font-semibold text-slate-900">{filteredPayslips.length.toLocaleString()}</span> payslips
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSlipPage((p) => Math.max(1, p - 1))}
                        disabled={slipPage <= 1}
                        className="btn-outline text-xs py-1 px-2.5 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>Previous</span>
                      </button>
                      <span className="font-mono text-xs px-2 text-slate-700">
                        Page {slipPage} of {totalFilteredPages}
                      </span>
                      <button
                        onClick={() => setSlipPage((p) => Math.min(totalFilteredPages, p + 1))}
                        disabled={slipPage >= totalFilteredPages}
                        className="btn-outline text-xs py-1 px-2.5 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

            </div>

          </div>
        )}

      </div>

      {/* ----------------- TWO-STEP PAYRUN WIZARD MODAL ----------------- */}
      {wizardOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">

            {/* Wizard Header */}
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 z-10">
              <div>
                <h3 className="font-bold text-sm text-[#2C3E50]">Payrun Setup Wizard</h3>
                <span className="text-[11px] text-slate-500">
                  {wizardStep === 1 ? "Step 1 of 2: Define Structure & Payroll Period" : "Step 2 of 2: Select Eligible Employees"}
                </span>
              </div>
              <button onClick={() => setWizardOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* STEP 1: DEFINE SCOPE */}
            {wizardStep === 1 && (
              <form onSubmit={handleWizardContinue} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">Payrun Batch Name *</label>
                  <input
                    type="text"
                    required
                    value={wizardForm.name}
                    onChange={(e) => setWizardForm({ ...wizardForm, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-medium mb-1">Salary Structure *</label>
                  <select
                    required
                    value={wizardForm.salaryStructureId}
                    onChange={(e) => setWizardForm({ ...wizardForm, salaryStructureId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                  >
                    {structures.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Period Start Date *</label>
                    <input
                      type="date"
                      required
                      value={wizardForm.periodStart}
                      onChange={(e) => setWizardForm({ ...wizardForm, periodStart: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">Period End Date *</label>
                    <input
                      type="date"
                      required
                      value={wizardForm.periodEnd}
                      onChange={(e) => setWizardForm({ ...wizardForm, periodEnd: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67]"
                    />
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-200">
                  <button type="button" onClick={() => setWizardOpen(false)} className="btn-outline text-xs">
                    Discard
                  </button>
                  <button type="submit" disabled={wizardLoading} className="btn-primary text-xs">
                    <span>{wizardLoading ? 'Finding Eligible Staff...' : 'Continue to Employee Selection ➔'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: SELECT EMPLOYEES */}
            {wizardStep === 2 && (
              <div className="p-6 space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">
                    Found <b>{eligibleEmployees.length}</b> eligible active employees with valid contracts for {wizardForm.name}:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedEmpIds.length === eligibleEmployees.length) {
                        setSelectedEmpIds([]);
                      } else {
                        setSelectedEmpIds(eligibleEmployees.map((e) => e.id));
                      }
                    }}
                    className="text-xs text-[#714B67] hover:underline font-semibold"
                  >
                    {selectedEmpIds.length === eligibleEmployees.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="border border-slate-200 rounded max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {eligibleEmployees.map((emp) => {
                    const isChecked = selectedEmpIds.includes(emp.id);
                    return (
                      <label key={emp.id} className="flex items-center gap-3 p-2.5 hover:bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setSelectedEmpIds(selectedEmpIds.filter((id) => id !== emp.id));
                            } else {
                              setSelectedEmpIds([...selectedEmpIds, emp.id]);
                            }
                          }}
                          className="rounded text-[#714B67] focus:ring-[#714B67] w-4 h-4"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-slate-800">{emp.name} <span className="font-mono text-slate-400 font-normal">({emp.employeeId})</span></div>
                          <div className="text-[11px] text-slate-500">{emp.department?.name} • {emp.jobPosition?.title}</div>
                        </div>
                        <div className="text-right font-mono font-bold text-teal-700">
                          ₹{emp.applicableContract?.wage?.toLocaleString() || 0} / mo
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setWizardStep(1)}
                    className="btn-outline text-xs"
                  >
                    ⬅ Back to Step 1
                  </button>
                  <button
                    type="button"
                    onClick={handleCreatePayrun}
                    disabled={wizardLoading || selectedEmpIds.length === 0}
                    className="btn-primary text-xs"
                  >
                    <span>{wizardLoading ? 'Initializing...' : `Create Payrun (${selectedEmpIds.length} Employees)`}</span>
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* ----------------- PAYSLIP BREAKDOWN MODAL ----------------- */}
      {viewPayslip && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-200 bg-[#714B67] text-white flex items-center justify-between rounded-t-lg sticky top-0 z-10">
              <div>
                <h3 className="font-bold text-sm">{viewPayslip.payslipNumber}</h3>
                <span className="text-xs text-white/80">{viewPayslip.employee?.name} • {viewPayslip.employee?.employeeId}</span>
              </div>
              <button onClick={() => setViewPayslip(null)} className="text-white/80 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded border border-slate-200">
                <div>Working Days: <b>{viewPayslip.workingDays}d</b></div>
                <div>Present Days: <b>{viewPayslip.presentDays}d</b></div>
                <div>Leave Days: <b>{viewPayslip.leaveDays}d</b></div>
                <div>Overtime: <b>{viewPayslip.overtimeHours}h</b></div>
              </div>

              <div>
                <h4 className="font-semibold text-slate-700 uppercase tracking-wider text-[11px] mb-2">
                  Salary Rule Lines Breakdown
                </h4>
                <div className="border border-slate-200 rounded divide-y divide-slate-100">
                  {viewPayslip.payslipLines?.map((l) => (
                    <div key={l.id} className="flex justify-between py-1.5 px-3">
                      <div>
                        <span className="font-semibold text-slate-800">{l.name}</span>
                        <span className="ml-1.5 text-[10px] font-mono text-slate-400">({l.code})</span>
                      </div>
                      <span className={`font-mono font-semibold ${l.category === 'DEDUCTION' ? 'text-rose-600' : 'text-slate-800'}`}>
                        {l.category === 'DEDUCTION' ? '-' : ''}₹{l.amount?.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-teal-50 border border-teal-200 rounded flex justify-between items-center text-teal-950">
                <span className="font-bold">Net Salary Payable:</span>
                <span className="font-mono text-base font-extrabold text-teal-800">
                  ₹{viewPayslip.netSalary?.toLocaleString()}
                </span>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => handleSendSinglePayslip(viewPayslip.id, viewPayslip.employee?.name)}
                  disabled={sendingSlipId === viewPayslip.id}
                  className="btn-outline text-xs text-[#714B67] hover:border-[#714B67] flex items-center justify-center gap-1.5"
                >
                  <Send className={`w-3.5 h-3.5 ${sendingSlipId === viewPayslip.id ? 'animate-pulse' : ''}`} />
                  <span>{sendingSlipId === viewPayslip.id ? 'Sending Email...' : 'Email to Employee'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadPDF(viewPayslip.id, viewPayslip.payslipNumber)}
                  className="btn-primary text-xs flex items-center justify-center gap-1.5"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Download PDF Document</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Feedback Notification */}
      {feedbackToast && (
        <div className="fixed top-20 right-6 z-50 bg-[#00A09D] text-white px-4 py-2.5 rounded-lg shadow-xl text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top-2 border border-teal-600">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />
          <span>{feedbackToast.message}</span>
        </div>
      )}

      {/* 1-Click Technical Error Diagnostics Modal */}
      {errorInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-700">
                <AlertCircle className="w-5 h-5" />
                <h3 className="font-bold text-sm text-[#2C3E50]">Operation Failed - Technical Diagnostics</h3>
              </div>
              <button
                onClick={() => setErrorInfo(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded bg-rose-50 border border-rose-200 text-rose-800">
                <strong>Error:</strong> {errorInfo.message}
              </div>

              <div>
                <span className="text-[11px] font-semibold uppercase text-slate-500 block mb-1.5">
                  Technical Diagnostics (Click below to copy & send):
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
                  <button
                    onClick={() => setErrorInfo(null)}
                    className="btn-outline text-xs px-3 py-1.5"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={handleCopyError}
                    className="btn-primary text-xs px-3.5 py-1.5 flex items-center gap-1.5 shadow-sm"
                  >
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
