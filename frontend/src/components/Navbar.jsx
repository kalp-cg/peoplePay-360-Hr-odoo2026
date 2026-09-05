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
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Building2,
  SlidersHorizontal,
  FileCode2,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';

export default function Navbar({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [attStatus, setAttStatus] = useState({ checkedIn: false, elapsedHours: 0, loading: false });
  const [sidebarOpen, setSidebarOpen] = useState(true);
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

  const navGroups = [
    {
      title: 'CORE HR',
      items: [
        { label: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'EMPLOYEE'] },
        { label: user?.role === 'EMPLOYEE' ? 'My Profile' : 'Employees', path: user?.role === 'EMPLOYEE' ? '/my-profile' : '/employees', icon: Users, roles: ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'EMPLOYEE'] },
        { label: 'Contracts', path: '/contracts', icon: FileText, roles: ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'] },
        { label: 'Schedules', path: '/schedules', icon: Calendar, roles: ['ADMIN', 'HR_MANAGER'] },
      ]
    },
    {
      title: 'PAYROLL & TIME',
      items: [
        { label: 'Attendance', path: '/attendance', icon: Clock, roles: ['ADMIN', 'HR_MANAGER', 'EMPLOYEE', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'] },
        { label: 'Time Off', path: '/time-off', icon: Plane, roles: ['ADMIN', 'HR_MANAGER', 'EMPLOYEE', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'] },
        { label: 'Payroll Payruns', path: '/payroll', icon: DollarSign, roles: ['ADMIN', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'] },
        { label: 'Salary Rules', path: '/salary-config', icon: Sliders, roles: ['ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'] },
      ]
    },
    {
      title: 'SYSTEM ADMIN',
      items: [
        { label: 'User Control', path: '/users', icon: Shield, roles: ['ADMIN'] },
        { label: 'Audit Logs', path: '/audit-logs', icon: Shield, roles: ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_MANAGER'] },
      ]
    }
  ];

  return (
    <div className="min-h-screen flex bg-[#F8F9FA] text-slate-800 select-none">
      
      {/* ---------------- LEFT SIDEBAR NAVIGATION ---------------- */}
      <aside 
        className={`bg-[#4A2E48] text-white flex flex-col transition-all duration-300 z-40 fixed lg:static inset-y-0 left-0 shadow-xl ${
          sidebarOpen ? 'w-64' : 'w-20'
        } ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Sidebar Header / Logo */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-white/10 bg-[#3F263D]">
          <Link to="/" className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-[#00A09D] flex items-center justify-center shrink-0 shadow-md">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="2.2" strokeDasharray="42 12" />
                <path d="M12 7v5l3 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="2" fill="white" />
              </svg>
            </div>
            {sidebarOpen && (
              <span className="font-extrabold text-base tracking-wide text-white whitespace-nowrap">
                PeoplePay<span className="text-teal-300">360</span>
              </span>
            )}
          </Link>

          {/* Desktop Toggle Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden lg:flex p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
          >
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>

        {/* Sidebar Navigation Items */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {navGroups.map((group) => {
            const filteredItems = group.items.filter((item) => user && item.roles.includes(user.role));
            if (filteredItems.length === 0) return null;

            return (
              <div key={group.title} className="space-y-1">
                {sidebarOpen && (
                  <h4 className="px-3 text-[10px] font-bold tracking-wider text-teal-200 uppercase opacity-80 mb-2">
                    {group.title}
                  </h4>
                )}
                {filteredItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));

                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      title={!sidebarOpen ? item.label : undefined}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                        isActive
                          ? 'bg-[#00A09D] text-white shadow-md font-bold border-l-4 border-white'
                          : 'text-white/80 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-teal-200'}`} />
                      {sidebarOpen && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer User Card */}
        {sidebarOpen && user && (
          <div className="p-3 border-t border-white/10 bg-[#3F263D]/80 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#00A09D] text-white flex items-center justify-center font-extrabold text-xs shrink-0 shadow-xs">
                {(user?.name || 'U').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-white truncate">{user?.name}</p>
                <p className="text-[10px] text-teal-200 capitalize truncate">{user?.role?.toLowerCase().replace(/_/g, ' ')}</p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 hover:bg-white/10 rounded-lg text-white/70 hover:text-white transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </aside>

      {/* ---------------- MAIN CONTENT AREA & TOP HEADER BAR ---------------- */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* TOP HEADER BAR */}
        <header className="h-16 bg-[#5D3E5B] text-white border-b border-white/10 shadow-sm sticky top-0 z-30 px-4 sm:px-6 flex items-center justify-between shrink-0">
          
          {/* Left: Mobile Menu Toggle & Brand context */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-white/90">
              <span className="px-2 py-0.5 rounded bg-white/15 text-white text-[11px] font-mono">
                PeoplePay360 HRMS
              </span>
            </div>
          </div>

          {/* Center: Attendance Quick Action Buttons */}
          {user?.employeeId && (
            <div className="flex items-center bg-black/20 p-1 rounded-lg border border-white/15 text-xs gap-1.5">
              <button
                onClick={handleAttendanceToggle}
                disabled={attStatus.loading}
                title="Click to Check In or Check Out"
                className={`flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-md transition-all ${
                  attStatus.checkedIn
                    ? 'bg-[#00A09D] text-white shadow-xs'
                    : 'bg-white/15 text-white hover:bg-white/25'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${attStatus.checkedIn ? 'bg-emerald-300 animate-pulse' : 'bg-slate-300'}`}></span>
                <span>{attStatus.checkedIn ? 'Checked In' : 'Check In'}</span>
              </button>

              <div className="px-2.5 py-1 text-xs font-semibold text-white/80 flex items-center gap-1.5 hidden sm:flex">
                <span className={`w-2 h-2 rounded-full ${!attStatus.checkedIn ? 'bg-slate-400' : 'bg-slate-500'}`}></span>
                <span>Out of office</span>
              </div>
            </div>
          )}

          {/* Right: User Profile & Direct Logout */}
          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2 bg-white/10 border border-white/20 px-3 py-1 rounded-lg text-xs">
                <div className="w-6 h-6 rounded-full bg-[#00A09D] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                  {(user?.name || 'U').slice(0, 2).toUpperCase()}
                </div>
                <div className="flex flex-col text-left leading-tight">
                  <span className="font-bold text-white text-xs truncate max-w-[130px]">{user?.name}</span>
                  <span className="text-[10px] text-teal-200 capitalize truncate max-w-[130px]">{user?.role?.toLowerCase().replace(/_/g, ' ')}</span>
                </div>
              </div>
            )}

            <button
              onClick={logout}
              title="Logout"
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-xs px-3 py-1.5 rounded-lg font-semibold text-white transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>

        </header>

        {/* Page Content Body */}
        <main className="flex-1 flex flex-col">
          {children}
        </main>

      </div>

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

    </div>
  );
}

