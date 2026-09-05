import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Users, 
  FileText, 
  Calendar, 
  Clock, 
  Plane, 
  DollarSign, 
  BarChart3, 
  Shield, 
  LogOut,
  Sliders,
  Menu,
  X,
  AlertCircle,
  Copy,
  LayoutDashboard
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export default function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [attStatus, setAttStatus] = useState({ checkedIn: false, elapsedHours: 0, workedHours: 0, loading: false });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [errorInfo, setErrorInfo] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchAttendanceStatus();
    const interval = setInterval(fetchAttendanceStatus, 30000);

    const handleSync = (e) => {
      if (e?.detail?.checkedIn !== undefined) {
        setAttStatus(prev => ({ ...prev, checkedIn: e.detail.checkedIn }));
      }
      fetchAttendanceStatus();
    };

    window.addEventListener('attendance-status-changed', handleSync);
    window.addEventListener('attendance-updated', handleSync);

    return () => {
      clearInterval(interval);
      window.removeEventListener('attendance-status-changed', handleSync);
      window.removeEventListener('attendance-updated', handleSync);
    };
  }, [user]);

  // Close mobile menu on page navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

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
      console.warn('[Attendance Status Fetch]:', err);
    }
  }

  async function handleAttendanceAction(action) {
    const nextCheckedIn = action === 'CHECK_IN';
    setAttStatus((prev) => ({ ...prev, checkedIn: nextCheckedIn, loading: true }));
    window.dispatchEvent(new CustomEvent('attendance-status-changed', {
      detail: { checkedIn: nextCheckedIn, action }
    }));

    try {
      const res = await api.post('/attendance/quick-toggle', { action });
      await fetchAttendanceStatus();
      window.dispatchEvent(new CustomEvent('attendance-updated'));
      window.dispatchEvent(new CustomEvent('attendance-status-changed', {
        detail: { checkedIn: res.data?.checkedIn ?? nextCheckedIn, record: res.data }
      }));
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

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'EMPLOYEE'] },
    { label: user?.role === 'EMPLOYEE' ? 'My Profile' : 'Employees', path: user?.role === 'EMPLOYEE' ? '/my-profile' : '/employees', icon: Users, roles: ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'EMPLOYEE'] },
    { label: 'Contracts', path: '/contracts', icon: FileText, roles: ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'] },
    { label: 'Schedules', path: '/schedules', icon: Calendar, roles: ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'] },
    { label: 'Attendance', path: '/attendance', icon: Clock, roles: ['ADMIN', 'HR_MANAGER', 'EMPLOYEE', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'] },
    { label: 'Time Off', path: '/time-off', icon: Plane, roles: ['ADMIN', 'HR_MANAGER', 'EMPLOYEE', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'] },
    { label: 'Payroll', path: '/payroll', icon: DollarSign, roles: ['ADMIN', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'] },
    { label: 'Salary Rules', path: '/salary-config', icon: Sliders, roles: ['ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'] },
  ];

  const filteredNav = navItems.filter((item) => user && item.roles.includes(user.role));

  return (
    <nav className="bg-[#5C3A56] border-b border-[#4A2E48] text-white sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          
          {/* Left Side: Brand Logo + Desktop Nav Links */}
          <div className="flex items-center gap-6 overflow-hidden">
            <Link to="/" className="flex items-center gap-2 font-bold text-base tracking-tight shrink-0 text-white hover:opacity-90 transition-opacity">
              <div className="w-7 h-7 rounded-full bg-[#00A09D] flex items-center justify-center text-white shadow-xs">
                <span className="text-xs font-black">P</span>
              </div>
              <span className="text-white">PeoplePay<span className="text-teal-300">360</span></span>
            </Link>

            <div className="hidden lg:flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
              {filteredNav.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                      isActive
                        ? 'bg-white/20 text-white shadow-2xs font-bold'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 text-teal-300" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right: Quick Actions, User Profile & Logout */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
            
            {/* Attendance Toggle Widget */}
            {user?.employeeId && (
              <div className="flex items-center bg-black/25 p-1 rounded-lg border border-white/15 text-xs gap-1 shadow-inner">
                {/* Left Button: Action Trigger */}
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
                  className={`flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-md transition-all shadow-xs ${
                    attStatus.checkedIn
                      ? 'bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-400'
                      : 'bg-[#00A09D] hover:bg-[#008b88] text-white border border-teal-400/40'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${attStatus.checkedIn ? 'bg-white animate-pulse' : 'bg-teal-200'}`}></span>
                  <span>
                    {attStatus.loading
                      ? 'Updating...'
                      : attStatus.checkedIn
                      ? `Checked In (${attStatus.elapsedHours}h)`
                      : attStatus.workedHours > 0
                      ? 'Check In Again'
                      : 'Check In'}
                  </span>
                </button>

                {/* Right Status Badge */}
                <div className="hidden md:flex items-center px-2.5 py-1 text-[11px] font-medium">
                  {attStatus.checkedIn ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                      Shift Active
                    </span>
                  ) : attStatus.workedHours > 0 ? (
                    <span className="px-2 py-0.5 rounded bg-rose-950/60 text-rose-200 border border-rose-500/40 flex items-center gap-1.5 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                      Checked Out ({attStatus.workedHours}h Logged Today)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-black/40 text-slate-300 border border-white/10 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                      Out of Office
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* User Profile Identity Pill */}
            {user && (
              <div className="hidden sm:flex items-center gap-2 bg-white/10 border border-white/20 px-2.5 py-1 rounded-md text-xs h-9">
                <div className="w-6 h-6 rounded-full bg-[#00A09D] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                  {(user?.name || 'U').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col justify-center text-left leading-tight">
                  <span className="font-bold text-white text-xs whitespace-nowrap">{user?.name}</span>
                  <span className="text-[9px] text-teal-200 capitalize whitespace-nowrap font-medium">
                    {user?.role?.toLowerCase().replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            )}

            {/* Direct Logout Button */}
            <button
              onClick={logout}
              title="Sign Out"
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-xs px-2.5 py-1.5 rounded-md font-semibold text-white transition-colors h-9 shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>

            {/* Mobile Drawer Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-md transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

          </div>

        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#4A2E48] border-t border-white/15 px-4 pt-3 pb-4 space-y-3 animate-in slide-in-from-top-2">
          <div className="flex items-center justify-between pb-3 border-b border-white/15">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#00A09D] text-white flex items-center justify-center font-bold text-xs">
                {(user?.name || 'U').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="text-xs font-bold text-white">{user?.name}</div>
                <div className="text-[10px] text-teal-200 capitalize">{user?.role?.toLowerCase().replace(/_/g, ' ')}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {filteredNav.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-[#00A09D] text-white font-bold shadow-xs'
                      : 'text-white/80 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4 text-teal-300" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Error Diagnostics Modal */}
      {errorInfo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-in fade-in">
          <div className="bg-white text-slate-900 border border-slate-200 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-4 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                <h3 className="font-bold text-sm text-rose-900">Action Notice</h3>
              </div>
              <button 
                onClick={() => setErrorInfo(null)} 
                className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-rose-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800">
                <strong>Error:</strong> {errorInfo.message}
              </div>

              <div>
                <span className="text-[11px] font-semibold uppercase text-slate-500 block mb-1.5">
                  Technical Diagnostics:
                </span>
                <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-[11px] overflow-x-auto max-h-40 leading-relaxed select-all">
                  <pre>{JSON.stringify(errorInfo, null, 2)}</pre>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-[11px] text-slate-500">
                  {copied ? '✓ Copied to clipboard!' : 'Click to copy error payload'}
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
    </nav>
  );
}
