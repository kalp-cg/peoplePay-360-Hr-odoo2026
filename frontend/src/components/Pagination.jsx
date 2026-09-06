import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Modern compact ERP pager (Odoo-style).
 * Designed to fit seamlessly in top toolbars, filter bars, and table headers.
 * Props:
 *   page        – current page (1-indexed)
 *   totalPages  – total number of pages
 *   total       – total number of records
 *   limit       – records per page
 *   onPageChange(newPage) – callback
 *   className   – optional extra CSS classes
 */
export default function Pagination({ page = 1, totalPages = 1, total = 0, limit = 25, onPageChange, className = '' }) {
  if (!total || total === 0) return null;

  const from = Math.min((page - 1) * limit + 1, total);
  const to = Math.min(page * limit, total);

  return (
    <div className={`flex items-center gap-2.5 text-xs text-slate-600 select-none ${className}`}>
      {/* Record range indicator */}
      <span className="font-medium text-slate-500 whitespace-nowrap">
        Showing <span className="font-semibold text-slate-800 tabular-nums">{from}–{to}</span> of{' '}
        <span className="font-semibold text-slate-800 tabular-nums">{total}</span>
      </span>

      {/* Pager controls (only if more than 1 page) */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md p-0.5 shadow-2xs">
          {/* Previous Page */}
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className="p-1 rounded text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Previous page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* Quick Page Jump Dropdown */}
          <select
            value={page}
            onChange={(e) => onPageChange(Number(e.target.value))}
            className="px-1.5 py-0.5 text-[11px] font-mono font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#714B67] cursor-pointer"
            title="Jump to page"
          >
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <option key={p} value={p}>
                {p} / {totalPages}
              </option>
            ))}
          </select>

          {/* Next Page */}
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            className="p-1 rounded text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Next page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
