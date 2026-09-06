import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ROLE_LABELS = {
  EMPLOYEE: 'Employee',
  HR_MANAGER: 'HR Manager',
  HR_PAYROLL_USER: 'HR Payroll User',
  HR_PAYROLL_MANAGER: 'HR Payroll Manager',
  ADMIN: 'Administrator',
};

/**
 * Shown when a signed-in user opens a page their role does not permit.
 *
 * Without this the page still rendered its own empty state - the Users screen
 * reported "Total Accounts 0 / No matching user accounts found", which reads as
 * "there are no users" rather than "you are not allowed to see this".
 */
export default function AccessDenied({ requiredRole, resource }) {
  const { user } = useAuth();
  const currentLabel = ROLE_LABELS[user?.role] || user?.role || 'Unknown';
  const requiredLabel = ROLE_LABELS[requiredRole] || requiredRole;

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-16 bg-[#F8F9FA]">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-[#714B67] to-[#53364c] px-6 py-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">Access Restricted</h1>
            <p className="text-[11px] uppercase tracking-wider text-[#99f6e4] font-semibold mt-0.5">
              Error 403 &middot; Insufficient permissions
            </p>
          </div>
        </div>

        <div className="px-6 py-6">
          <p className="text-sm text-slate-600 leading-relaxed">
            {resource ? (
              <>Your role does not include access to <strong className="text-slate-900">{resource}</strong>.</>
            ) : (
              <>Your role does not include access to this area of the platform.</>
            )}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="border border-slate-200 rounded-md px-3 py-2.5 bg-slate-50">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Signed in as</div>
              <div className="text-sm font-bold text-slate-800 mt-0.5">{currentLabel}</div>
            </div>
            <div className="border border-slate-200 rounded-md px-3 py-2.5 bg-slate-50">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Requires</div>
              <div className="text-sm font-bold text-[#714B67] mt-0.5">
                {requiredLabel ? `${requiredLabel} or above` : 'Elevated access'}
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-start gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-3 py-2.5">
            <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
            <span>
              Permissions are enforced by the server as well as the interface, so this restriction
              applies to the underlying data and not only to this screen.
            </span>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#714B67] hover:bg-[#5d3d55] text-white text-xs font-semibold rounded transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to my dashboard</span>
            </Link>
            <span className="text-xs text-slate-400">
              Need this access? Contact your administrator.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
