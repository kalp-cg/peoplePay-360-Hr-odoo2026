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

  const [attStatus, setAttStatus] = useState({ checkedIn: false, elapsedHours: 0, loading: false });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [errorInfo, setErrorInfo] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchAttendanceStatus();
    const interval = setInterval(fetchAttendanceStatus, 30000);

    const handleSync = (e) => {
      if (e.detail?.checkedIn !== undefined) {
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
    // Optimistic update
    setAttStatus((prev) => ({ ...prev, checkedIn: nextCheckedIn, loading: true }));
    window.dispatchEvent(new CustomEvent('attendance-status-changed', {
      detail: { checkedIn: nextCheckedIn, action }
    }));

    try {
      const res = await api.post('/attendance/quick-toggle', { action });
      await fetchAttendanceStatus();
      window.dispatchEvent(new CustomEvent('attendance-status-changed', {
        detail: { checkedIn: res.data?.checkedIn ?? nextCheckedIn, record: res.data }
      }));
    } catch (err) {
      console.error('[Attendance Action Error]:', err);
      alert(err.message || `Failed to ${action === 'CHECK_IN' ? 'check in' : 'check out'}.`);
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

  const filteredNav = navItems.filter((item) => item.roles.includes(user?.role));

  return (
    <header className="bg-[#714B67] text-white sticky top-0 z-50 shadow-md">
      {/* Top Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">

          {/* Left: Brand / Logo */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-[#00A09D] flex items-center justify-center font-bold text-base text-white shadow-sm group-hover:scale-105 transition-transform">
                <span>⏱</span>
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-base tracking-tight text-white leading-tight">
                  PeoplePay<span className="text-teal-300">360</span>
                </span>
                <span className="text-[9px] uppercase tracking-wider text-teal-200 font-semibold leading-none">
                  HR & Payroll
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1">
              {filteredNav.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-[#00A09D] text-white font-bold shadow-xs'
                        : 'text-white/85 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: Quick Actions, User Profile & Logout */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
            
            {/* Attendance Two-Option Controls: Check In & Check Out */}
            {user?.employeeId && (
              <div className="flex items-center bg-black/25 p-0.5 rounded-md border border-white/15 text-xs gap-1">
                {/* Option 1: Check In */}
                <button
                  type="button"
                  onClick={() => handleAttendanceAction('CHECK_IN')}
                  disabled={attStatus.loading || attStatus.checkedIn}
                  title={attStatus.checkedIn ? 'You are currently Checked In' : 'Click to Check In for Today'}
                  className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded transition-all ${
                    attStatus.checkedIn
                      ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/30 cursor-default'
                      : 'bg-[#00A09D] hover:bg-[#008b88] text-white cursor-pointer shadow-xs active:scale-95'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${attStatus.checkedIn ? 'bg-emerald-400 animate-pulse' : 'bg-teal-200'}`}></span>
                  <span>{attStatus.checkedIn ? 'Checked In' : 'Check In'}</span>
                </button>

                {/* Option 2: Check Out */}
                <button
                  type="button"
                  onClick={() => handleAttendanceAction('CHECK_OUT')}
                  disabled={attStatus.loading || !attStatus.checkedIn}
                  title={!attStatus.checkedIn ? 'You are currently Out of Office' : 'Click to Check Out of Office'}
                  className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded transition-all ${
                    !attStatus.checkedIn
                      ? 'text-white/40 bg-white/5 border border-transparent cursor-default'
                      : 'bg-[#714B67] hover:bg-[#5a3b52] text-white cursor-pointer shadow-xs active:scale-95 border border-white/20'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${!attStatus.checkedIn ? 'bg-slate-400' : 'bg-rose-400 animate-pulse'}`}></span>
                  <span>{attStatus.checkedIn ? 'Check Out' : 'Out of Office'}</span>
                </button>
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
    </header>
  );
}

