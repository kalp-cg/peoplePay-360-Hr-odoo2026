import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Menu, 
  Clock, 
  AlertCircle, 
  Copy, 
  Check, 
  ShieldCheck, 
  Sparkles 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export default function TopHeader({ onOpenMobileSidebar = () => {} }) {
  const { user } = useAuth();
  const location = useLocation();

  const [attStatus, setAttStatus] = useState({ checkedIn: false, elapsedHours: 0, workedHours: 0, loading: false });
  const [errorInfo, setErrorInfo] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Immediately reset attendance state so previous user's status never persists across sessions
    setAttStatus({
      checkedIn: false,
      elapsedHours: 0,
      workedHours: 0,
      hasCheckedInToday: false,
      hasCheckedOutToday: false,
      loading: Boolean(user),
    });

    if (!user) return;

    fetchAttendanceStatus();
    const interval = setInterval(fetchAttendanceStatus, 30000);

    const handleSync = (e) => {
      if (e?.detail?.checkedIn !== undefined) {
        setAttStatus(prev => ({ ...prev, checkedIn: e.detail.checkedIn }));
      }
      fetchAttendanceStatus();
    };

    const handleStorage = (e) => {
      if (e.key === 'peoplepay_attendance_sync') {
        fetchAttendanceStatus();
      }
    };

    window.addEventListener('attendance-status-changed', handleSync);
    window.addEventListener('attendance-updated', handleSync);
    window.addEventListener('storage', handleStorage);

    return () => {
      clearInterval(interval);
      window.removeEventListener('attendance-status-changed', handleSync);
      window.removeEventListener('attendance-updated', handleSync);
      window.removeEventListener('storage', handleStorage);
    };
  }, [user?.id, user?.email]);

  async function fetchAttendanceStatus() {
    if (!user) return;
    try {
      const res = await api.get('/attendance/current-status');
      if (res.data) {
        setAttStatus({
          checkedIn: res.data.checkedIn,
          elapsedHours: res.data.elapsedHours || 0,
          workedHours: res.data.workedHours || res.data.elapsedHours || 0,
          hasCheckedInToday: res.data.hasCheckedInToday ?? Boolean(res.data.checkInTime),
          hasCheckedOutToday: res.data.hasCheckedOutToday ?? Boolean(res.data.checkOutTime),
          loading: false,
        });
      }
    } catch (err) {
      console.warn('[TopHeader Attendance Fetch]:', err);
    }
  }

  async function handleAttendanceAction(action) {
    const nextCheckedIn = action === 'CHECK_IN';
    setAttStatus((prev) => ({ ...prev, loading: true }));

    try {
      const res = await api.post('/attendance/quick-toggle', { action });
      await fetchAttendanceStatus();
      window.dispatchEvent(new CustomEvent('attendance-updated'));
      window.dispatchEvent(new CustomEvent('attendance-status-changed', {
        detail: { checkedIn: res.data?.checkedIn ?? nextCheckedIn, record: res.data }
      }));
      localStorage.setItem('peoplepay_attendance_sync', Date.now().toString());
    } catch (err) {
      console.error('[Attendance Action Error]:', err);
      setErrorInfo({
        action: 'Attendance Check-in / Check-out',
        message: err.message || 'Failed to toggle attendance status.',
        user: { name: user?.name, email: user?.email, role: user?.role, employeeId: user?.employeeId },
        timestamp: new Date().toISOString(),
        url: window.location.href,
        stack: err.stack || err.toString(),
      });
      await fetchAttendanceStatus();
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

  const getPageTitle = () => {
    const p = location.pathname;
    if (p === '/') return 'Enterprise Dashboard';
    if (p.startsWith('/employees')) return 'Employee Directory';
    if (p.startsWith('/my-profile')) return 'My Employee Profile';
    if (p.startsWith('/contracts')) return 'Contracts Management';
    if (p.startsWith('/schedules')) return 'Working Schedules';
    if (p.startsWith('/attendance')) return 'Time & Attendance Logs';
    if (p.startsWith('/time-off')) return 'Time Off & Leave Management';
    if (p.startsWith('/payroll')) return 'Payroll & Batch Processing';
    if (p.startsWith('/salary-config')) return 'Salary Rules Engine';
    if (p.startsWith('/users')) return 'User Administration';
    if (p.startsWith('/audit-logs')) return 'Security & Audit Logs';
    return 'PeoplePay360 ERP';
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200 shadow-xs h-14">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between">
        
        {/* Left Side: Mobile Menu Button + Current Route Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onOpenMobileSidebar}
            className="md:hidden p-1.5 rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors shrink-0"
            title="Open navigation sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="font-semibold text-xs text-slate-400 hidden sm:inline">PeoplePay360</span>
            <span className="text-slate-300 hidden sm:inline">/</span>
            <h2 className="font-bold text-xs sm:text-sm text-[#2C3E50] tracking-tight truncate max-w-[135px] sm:max-w-none">
              {getPageTitle()}
            </h2>
          </div>
        </div>

        {/* Right Side: Punch Clock & Status */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          
          {/* Quick Punch Clock Widget */}
          {user && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAttendanceAction(attStatus.checkedIn ? 'CHECK_OUT' : 'CHECK_IN')}
                disabled={attStatus.loading}
                title={
                  attStatus.checkedIn
                    ? `Shift Active (${attStatus.elapsedHours}h). Click to Check Out`
                    : attStatus.workedHours > 0
                    ? `Logged ${attStatus.workedHours}h today. Click to Check In Again`
                    : 'Click to Check In for Today'
                }
                className={`flex items-center gap-1.5 text-[11px] sm:text-xs font-bold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md transition-all shadow-xs cursor-pointer ${
                  attStatus.checkedIn
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-[#00A09D] hover:bg-[#008b88] text-white'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${attStatus.checkedIn ? 'bg-white animate-pulse' : 'bg-teal-200'}`} />
                <span>
                  {attStatus.loading
                    ? 'Updating...'
                    : attStatus.checkedIn
                    ? `In (${attStatus.elapsedHours}h)`
                    : attStatus.workedHours > 0
                    ? 'In Again'
                    : 'Check In'}
                </span>
              </button>

              <div className="hidden lg:flex items-center text-[11px] font-medium">
                {attStatus.checkedIn ? (
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-300 font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                    Shift Active
                  </span>
                ) : attStatus.workedHours > 0 ? (
                  <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                    Checked Out ({attStatus.workedHours}h)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                    Out of Office
                  </span>
                )}
              </div>
            </div>
          )}

          {/* User Role Tag */}
          {user && (
            <span className="hidden sm:inline-flex px-2 py-0.5 rounded text-[10px] font-bold bg-[#714B67]/10 text-[#714B67] border border-[#714B67]/20 uppercase">
              {user.role}
            </span>
          )}
        </div>
      </div>

      {/* Diagnostics Modal if toggle fails */}
      {errorInfo && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-5 text-xs space-y-3 border border-slate-200">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-bold text-rose-700 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>Attendance Operation Error</span>
              </span>
              <button onClick={() => setErrorInfo(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <p className="text-slate-700">{errorInfo.message}</p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={handleCopyError} className="btn-outline text-xs">
                {copied ? '✓ Copied' : 'Copy Diagnostics'}
              </button>
              <button onClick={() => setErrorInfo(null)} className="btn-primary text-xs">Close</button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
