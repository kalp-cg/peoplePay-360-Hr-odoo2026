import React from 'react';
import { AlertOctagon, RefreshCw, ArrowLeft } from 'lucide-react';

/**
 * Catches render-time crashes so a broken component shows a recovery screen
 * instead of a blank white page.
 *
 * This is what a bug like `empRes.data.find is not a function` used to look
 * like: React unmounted the whole tree and the user was left staring at nothing,
 * with the real cause only visible in the browser console.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Keep the stack in the console for developers; never show it to the user.
    console.error('[PeoplePay360] Unhandled UI error:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex-1 flex items-center justify-center px-6 py-16 bg-[#F8F9FA] min-h-screen">
        <div className="w-full max-w-lg bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-rose-600 to-rose-700 px-6 py-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/15 border border-white/20 flex items-center justify-center shrink-0">
              <AlertOctagon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">Something went wrong</h1>
              <p className="text-[11px] uppercase tracking-wider text-rose-100 font-semibold mt-0.5">
                This screen could not be displayed
              </p>
            </div>
          </div>

          <div className="px-6 py-6">
            <p className="text-sm text-slate-600 leading-relaxed">
              An unexpected error stopped this page from rendering. Your data has not been
              affected &mdash; nothing was saved or changed.
            </p>

            <div className="mt-4 border border-slate-200 rounded-md px-3 py-2.5 bg-slate-50">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                Technical detail
              </div>
              <div className="text-xs font-mono text-slate-700 mt-1 break-all">
                {String(this.state.error?.message || this.state.error)}
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#714B67] hover:bg-[#5d3d55] text-white text-xs font-semibold rounded transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload this page</span>
              </button>
              <button
                onClick={() => { window.location.href = '/'; }}
                className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to dashboard</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
