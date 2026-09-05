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

  async function handleAttendanceToggle() {
    setAttStatus((prev) => ({ ...prev, loading: true }));
    try {
      await api.post('/attendance/quick-toggle');
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
    { label: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'EMPLOYEE'] },
    { label: user?.role === 'EMPLOYEE' ? 'My Profile' : 'Employees', path: user?.role === 'EMPLOYEE' ? '/my-profile' : '/employees', icon: Users, roles: ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'EMPLOYEE'] },
    { label: 'Contracts', path: '/contracts', icon: FileText, roles: ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'] },
    { label: 'Attendance', path: '/attendance', icon: Clock, roles: ['ADMIN', 'HR_MANAGER', 'EMPLOYEE', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'] },
    { label: 'Time Off', path: '/time-off', icon: Plane, roles: ['ADMIN', 'HR_MANAGER', 'EMPLOYEE', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'] },
    { label: 'Payroll', path: '/payroll', icon: DollarSign, roles: ['ADMIN', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'] },
    { label: 'Salary Rules', path: '/salary-config', icon: Sliders, roles: ['ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'] },
  ];

  const filteredNav = navItems.filter((item) => user && item.roles.includes(user.role));

  return (
    <header className="bg-[#5D3E5B] text-white shadow-md select-none sticky top-0 z-50">
      <div className="max-w-[1536px] mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-14 min-h-[56px]">
          
          {/* Left: Brand Logo & Navigation Items */}
          <div className="flex items-center gap-2 lg:gap-4 overflow-x-auto no-scrollbar py-1">
            <Link to="/" className="flex items-center gap-2 font-extrabold text-base tracking-tight shrink-0 mr-1 hover:opacity-95 transition-opacity">
              <div className="w-8 h-8 rounded-full bg-[#00A09D] flex items-center justify-center shadow-xs shrink-0">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2.2" strokeDasharray="42 12" />
                  <path d="M12 7v5l3 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="12" cy="12" r="2" fill="white" />
                </svg>
              </div>
              <span className="font-bold text-white text-base tracking-wide whitespace-nowrap">
                PeoplePay<span className="text-teal-300">360</span>
              </span>
            </Link>

            {/* Horizontal Nav Links */}
            <nav className="hidden lg:flex items-center space-x-1 shrink-0">
              {filteredNav.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-white/20 text-white font-bold shadow-xs border border-white/25'
                        : 'text-white/85 hover:text-white hover:bg-white/10 font-medium'
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
            
            {/* Attendance Toggle Widget */}
            {user?.employeeId && (
              <div className="flex items-center bg-black/20 p-1 rounded-md border border-white/15 text-xs gap-1">
                <button
                  onClick={handleAttendanceToggle}
                  disabled={attStatus.loading}
                  title="Click to Check In or Check Out"
                  className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded transition-all ${
                    attStatus.checkedIn
                      ? 'bg-[#00A09D] text-white shadow-xs'
                      : 'bg-white/15 text-white hover:bg-white/25'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${attStatus.checkedIn ? 'bg-emerald-300 animate-pulse' : 'bg-slate-300'}`}></span>
                  <span>{attStatus.checkedIn ? 'Checked In' : 'Check In'}</span>
                </button>

                <div className="px-2 py-1 text-[11px] font-medium text-white/80 flex items-center gap-1.5 hidden md:flex">
                  <span className={`w-2 h-2 rounded-full ${!attStatus.checkedIn ? 'bg-slate-400' : 'bg-slate-500'}`}></span>
                  <span>Out of office</span>
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
    </header>
  );
}

