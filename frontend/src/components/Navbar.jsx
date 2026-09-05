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
  Copy
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
    return () => clearInterval(interval);
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
          elapsedHours: res.data.elapsedHours,
          loading: false,
        });
      }
    } catch (err) {
      console.warn('[Attendance Status Fetch]:', err);
    }
  }

  async function handleAttendanceToggle() {
    setAttStatus((prev) => ({ ...prev, loading: true }));
    console.log('[Attendance Toggle] Request initiated for:', {
      user: user?.email,
      role: user?.role,
      employeeId: user?.employeeId,
      statusBefore: attStatus
    });

    try {
      const res = await api.post('/attendance/quick-toggle');
      console.log('[Attendance Toggle Success]:', res);
      await fetchAttendanceStatus();
    } catch (err) {
      console.error('[Attendance Toggle Error]:', err);
      setErrorInfo({
        action: 'Attendance Check-in / Check-out',
        message: err.message || 'Failed to toggle attendance status.',
        user: { name: user?.name, email: user?.email, role: user?.role, employeeId: user?.employeeId },
        timestamp: new Date().toISOString(),
        url: window.location.href,
        stack: err.stack || err.toString(),
      });
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
    { label: 'Dashboard', path: '/', icon: BarChart3, roles: ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'EMPLOYEE'] },
    { label: user?.role === 'EMPLOYEE' ? 'My Profile' : 'Employees', path: user?.role === 'EMPLOYEE' ? '/my-profile' : '/employees', icon: Users, roles: ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'EMPLOYEE'] },
    { label: 'Contracts', path: '/contracts', icon: FileText, roles: ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'] },
    { label: 'Schedules', path: '/schedules', icon: Calendar, roles: ['ADMIN', 'HR_MANAGER'] },
    { label: 'Attendance', path: '/attendance', icon: Clock, roles: ['ADMIN', 'HR_MANAGER', 'EMPLOYEE', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'] },
    { label: 'Time Off', path: '/time-off', icon: Plane, roles: ['ADMIN', 'HR_MANAGER', 'EMPLOYEE', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'] },
    { label: 'Payroll', path: '/payroll', icon: DollarSign, roles: ['ADMIN', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'] },
    { label: 'Salary Rules', path: '/salary-config', icon: Sliders, roles: ['ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'] },
    { label: 'Users', path: '/users', icon: Shield, roles: ['ADMIN'] },
    { label: 'Audit Logs', path: '/audit-logs', icon: Shield, roles: ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'] },
  ];

  const filteredNav = navItems.filter((item) => user && item.roles.includes(user.role));

  return (
    <header className="bg-[#714B67] text-white shadow-md select-none sticky top-0 z-50">
      {/* Top Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2.5 font-bold text-lg tracking-tight hover:opacity-95 transition-opacity">
              <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center border border-white/20 shadow-xs">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="9" stroke="#00A09D" strokeWidth="2.2" strokeDasharray="42 12" />
                  <path d="M12 7v5l3 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="12" r="2" fill="#00A09D" />
                </svg>
              </div>
              <span className="font-semibold tracking-wide">PeoplePay<span className="text-teal-300">360</span></span>
            </Link>

            {/* Odoo App Navigation Links (Desktop) */}
            <nav className="hidden xl:flex items-center space-x-1 ml-3">
              {filteredNav.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-xs font-medium transition-colors ${
                      isActive
                        ? 'bg-black/20 text-white shadow-inner font-semibold'
                        : 'text-white/80 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Action Widgets */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Section 2 Attendance Quick Action Navbar Widget */}
            {user?.employeeId && (
              <div className="hidden sm:flex items-center bg-black/25 px-2.5 py-1 rounded border border-white/15 text-xs">
                <button
                  onClick={handleAttendanceToggle}
                  disabled={attStatus.loading}
                  title="Click to Check In or Check Out"
                  className={`flex items-center gap-2 font-medium px-2 py-0.5 rounded transition-all ${
                    attStatus.checkedIn
                      ? 'bg-[#00A09D] hover:bg-[#008b88] text-white shadow-xs'
                      : 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${attStatus.checkedIn ? 'bg-teal-200 animate-pulse' : 'bg-slate-300'}`}></span>
                  <span>{attStatus.checkedIn ? 'Check Out' : 'Check In'}</span>
                </button>
                <div className="ml-2 pl-2 border-l border-white/20 text-slate-200 font-mono text-[11px] hidden md:block">
                  {attStatus.checkedIn ? `${attStatus.elapsedHours}h elapsed` : 'Out of office'}
                </div>
              </div>
            )}

            {/* User Profile Pill (Direct Logged-In Identity) */}
            {user && (
              <div className="hidden sm:flex items-center gap-2 bg-white/10 border border-white/20 px-2.5 py-1 rounded text-xs">
                <div className="w-6 h-6 rounded-full bg-[#00A09D] text-white flex items-center justify-center font-bold text-[10px]">
                  {(user?.name || 'U').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col text-left leading-tight">
                  <span className="font-semibold text-white truncate max-w-[130px]">{user?.name}</span>
                  <span className="text-[10px] text-teal-200 capitalize">{user?.role?.toLowerCase().replace(/_/g, ' ')}</span>
                </div>
              </div>
            )}

            {/* Direct Logout button */}
            <button
              onClick={logout}
              title="Sign Out"
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-xs px-2.5 py-1.5 rounded font-medium text-white transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>

            {/* Mobile Menu Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

          </div>

        </div>
      </div>

      {/* Mobile Slide-down Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-[#5a3b52] border-t border-white/15 px-4 pt-3 pb-4 space-y-3 animate-in slide-in-from-top-2">
          {/* User info in mobile drawer */}
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
            {user?.employeeId && (
              <button
                onClick={handleAttendanceToggle}
                disabled={attStatus.loading}
                className={`text-xs px-2.5 py-1 rounded font-semibold flex items-center gap-1.5 ${
                  attStatus.checkedIn
                    ? 'bg-[#00A09D] text-white'
                    : 'bg-white/15 text-white border border-white/20'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{attStatus.checkedIn ? 'Check Out' : 'Check In'}</span>
              </button>
            )}
          </div>

          {/* Navigation Links Grid */}
          <div className="grid grid-cols-2 gap-1.5">
            {filteredNav.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-black/30 text-white font-semibold shadow-inner'
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

      {/* Error Diagnostics Modal with 1-Click Copy Details */}
      {errorInfo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100] animate-in fade-in">
          <div className="bg-white text-slate-900 border border-slate-200 rounded-lg shadow-2xl max-w-lg w-full overflow-hidden">
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
    </header>
  );
}
