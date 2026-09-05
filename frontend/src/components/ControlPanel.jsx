import React from 'react';
import { Search, LayoutGrid, ListFilter } from 'lucide-react';

export default function ControlPanel({
  title,
  subtitle,
  breadcrumbs = [],
  actions = null,
  statusRibbon = null,
  searchQuery = '',
  onSearchChange = null,
  searchPlaceholder = 'Search...',
  viewMode = null,
  onViewModeChange = null,
  children = null,
}) {
  return (
    <div className="bg-white border-b border-slate-200 shadow-sm w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Left: Breadcrumbs & Title */}
          <div className="flex flex-col">
            {breadcrumbs.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                {breadcrumbs.map((crumb, idx) => (
                  <React.Fragment key={idx}>
                    {idx > 0 && <span>/</span>}
                    {crumb.link ? (
                      <a href={crumb.link} className="hover:text-[#714B67] hover:underline transition-colors">
                        {crumb.label}
                      </a>
                    ) : (
                      <span>{crumb.label}</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            )}
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-[#2C3E50] tracking-tight">{title}</h1>
              {subtitle && (
                <span className="text-xs font-normal text-slate-500 border-l border-slate-300 pl-3 hidden sm:inline">
                  {subtitle}
                </span>
              )}
            </div>
          </div>

          {/* Right: Actions, Search, View Toggles & Status Pipeline */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto justify-start sm:justify-end">
            
            {/* Status Pipeline Ribbon */}
            {statusRibbon && (
              <div className="w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">{statusRibbon}</div>
            )}

            {/* Search Bar */}
            {onSearchChange && (
              <div className="relative flex-1 sm:flex-initial min-w-[130px] sm:min-w-[180px] max-w-xs">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#714B67] focus:border-[#714B67] transition-all"
                />
              </div>
            )}

            {/* Primary & Secondary Action Buttons */}
            {actions && <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">{actions}</div>}

            {/* Kanban / List View Mode Toggle */}
            {viewMode && onViewModeChange && (
              <div className="flex items-center border border-slate-200 rounded p-0.5 bg-slate-50">
                <button
                  type="button"
                  onClick={() => onViewModeChange('list')}
                  title="List View"
                  className={`p-1 rounded text-xs transition-colors ${
                    viewMode === 'list' ? 'bg-white text-[#714B67] shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <ListFilter className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onViewModeChange('kanban')}
                  title="Kanban View"
                  className={`p-1 rounded text-xs transition-colors ${
                    viewMode === 'kanban' ? 'bg-white text-[#714B67] shadow-sm font-semibold' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Optional Secondary Filter Row (if provided) */}
        {children && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
