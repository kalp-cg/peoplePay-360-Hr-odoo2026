import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MapPinOff, ArrowLeft } from 'lucide-react';

/**
 * Shown for URLs that do not match any route.
 *
 * Previously `path="*"` silently redirected to the dashboard, so a mistyped or
 * stale link looked identical to a successful navigation.
 */
export default function NotFound() {
  const location = useLocation();

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-16 bg-[#F8F9FA]">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-[#2C3E50] to-[#1e2b38] px-6 py-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
            <MapPinOff className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-tight">Page Not Found</h1>
            <p className="text-[11px] uppercase tracking-wider text-slate-300 font-semibold mt-0.5">
              Error 404 &middot; No such route
            </p>
          </div>
        </div>

        <div className="px-6 py-6">
          <p className="text-sm text-slate-600 leading-relaxed">
            Nothing is mapped to this address in PeoplePay360.
          </p>

          <div className="mt-4 border border-slate-200 rounded-md px-3 py-2.5 bg-slate-50">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
              Requested path
            </div>
            <div className="text-sm font-mono text-slate-800 mt-0.5 break-all">
              {location.pathname}
            </div>
          </div>

          <div className="mt-6">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#714B67] hover:bg-[#5d3d55] text-white text-xs font-semibold rounded transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to my dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
