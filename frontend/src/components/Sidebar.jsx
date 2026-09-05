import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Users, 
  FileText, 
  Calendar, 
  Clock, 
  Plane, 
  DollarSign, 
  Sliders, 
  Shield, 
  BarChart3, 
  LogOut, 
  LayoutDashboard,
  X,
  Building2,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ open = false, onClose = () => {} }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'EMPLOYEE'] },
    { label: user?.role === 'EMPLOYEE' ? 'My Profile' : 'Employees', path: user?.role === 'EMPLOYEE' ? '/my-profile' : '/employees', icon: Users, roles: ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER', 'EMPLOYEE'] },
    { label: 'Contracts', path: '/contracts', icon: FileText, roles: ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'] },
    { label: 'Schedules', path: '/schedules', icon: Calendar, roles: ['ADMIN', 'HR_MANAGER', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'] },
    { label: 'Attendance', path: '/attendance', icon: Clock, roles: ['ADMIN', 'HR_MANAGER', 'EMPLOYEE', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'] },
    { label: 'Time Off', path: '/time-off', icon: Plane, roles: ['ADMIN', 'HR_MANAGER', 'EMPLOYEE', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'] },
    { label: 'Payroll', path: '/payroll', icon: DollarSign, roles: ['ADMIN', 'HR_PAYROLL_USER', 'HR_PAYROLL_MANAGER'] },
    { label: 'Salary Rules', path: '/salary-config', icon: Sliders, roles: ['ADMIN', 'HR_PAYROLL_MANAGER', 'HR_PAYROLL_USER'] },
    { label: 'Users & Roles', path: '/users', icon: Shield, roles: ['ADMIN'] },
    { label: 'Audit Logs', path: '/audit-logs', icon: BarChart3, roles: ['ADMIN'] },
  ];

  const filteredNav = navItems.filter((item) => user && item.roles.includes(user.role));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActivePath = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {open && (
        <div 
          onClick={onClose}
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Fixed Left Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-[#5C3A56] via-[#52334D] to-[#452840] border-r border-[#40243B] text-white flex flex-col justify-between transition-transform duration-200 ease-in-out shadow-xl ${
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Top Header & Brand */}
        <div className="shrink-0">
          <div className="h-16 px-5 flex items-center justify-between border-b border-white/10 bg-black/10">
            <Link to="/" onClick={onClose} className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-lg bg-[#00A09D] flex items-center justify-center text-white font-black text-sm shadow-md group-hover:scale-105 transition-transform">
                P
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm tracking-tight text-white leading-none">
                  PeoplePay<span className="text-[#00A09D]">360</span>
                </span>
                <span className="text-[10px] text-teal-200/80 font-medium tracking-wide uppercase mt-1">
                  Odoo HR Enterprise
                </span>
              </div>
            </Link>

            {/* Close Button on Mobile */}
            <button 
              onClick={onClose}
              className="md:hidden text-white/70 hover:text-white p-1 rounded-md hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Links - flex-1 min-h-0 overflow-y-auto */}
        <div className="flex-1 min-h-0 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-teal-200/60">
            Enterprise Modules
          </div>

          {filteredNav.map((item) => {
            const Icon = item.icon;
            const active = isActivePath(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-semibold transition-all relative group ${
                  active
                    ? 'bg-white/15 text-white shadow-xs font-bold'
                    : 'text-white/75 hover:text-white hover:bg-white/10'
                }`}
              >
                {/* Left Accent Bar for Active State */}
                {active && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#00A09D] rounded-r" />
                )}

                <Icon className={`w-4 h-4 shrink-0 transition-colors ${
                  active ? 'text-[#00A09D]' : 'text-white/70 group-hover:text-white'
                }`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Bottom Profile & Logout Footer */}
        <div className="shrink-0 p-3 border-t border-white/10 bg-black/15 space-y-2">
          {user && (
            <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#00A09D] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                {(user?.name || 'U').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="font-bold text-xs text-white truncate">{user?.name}</span>
                <span className="text-[10px] text-teal-200/90 font-medium capitalize truncate">
                  {user?.role?.toLowerCase().replace(/_/g, ' ')}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-semibold text-rose-200/90 hover:text-rose-100 hover:bg-rose-900/40 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-rose-300" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
