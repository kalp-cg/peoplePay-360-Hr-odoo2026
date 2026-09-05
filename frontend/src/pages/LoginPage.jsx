import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, Shield, UserCheck, AlertCircle } from 'lucide-react';
import { useAuth, DEMO_ACCOUNTS } from '../context/AuthContext';

import Btn from "./button.jsx";

export default function LoginPage() {
  const { login, quickLogin } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickDemoLogin(account) {
    setError('');
    setLoading(true);
    try {
      await quickLogin(account.email, account.pass);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#3a2034] to-[#714B67] flex items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 border border-white/20">

        {/* Left Side: Branding & Quick Evaluator Accounts */}
        <div className="bg-[#714B67] p-8 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Subtle background decoration */}
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
          <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-teal-500/10 rounded-full blur-2xl pointer-events-none"></div>

          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                <span className="text-teal-300 font-extrabold text-2xl">360</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                PeoplePay<span className="text-teal-300">360</span>
              </h1>
            </div>

            <p className="text-white/80 text-sm leading-relaxed mb-6">
              Integrated Human Resource & Payroll Operations Platform. Built with deterministic sequential rule calculation, period-valid contracts, and immutable audit logs.
            </p>

            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-teal-200 mb-2 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" />
                <span>1-Click Evaluator Demo Accounts</span>
              </div>

              <div className="space-y-1.5">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.role}
                    type="button"
                    onClick={() => handleQuickDemoLogin(acc)}
                    disabled={loading}
                    className="w-full text-left p-2.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/10 transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-xs font-semibold text-white group-hover:text-teal-200 transition-colors">
                        {acc.label}
                      </div>
                      <div className="text-[11px] text-white/60 font-mono">
                        {acc.email}
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-white/50 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/10 text-[11px] text-white/50 flex justify-between items-center">
            <span>Odoo Enterprise Palette</span>
            <span>Version 1.0 MVP</span>
          </div>
        </div>

        {/* Right Side: Standard Login Form */}
        <div className="p-8 flex flex-col justify-center bg-white">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900">Sign In to Workspace</h2>
            <p className="text-xs text-slate-500 mt-1">
              Enter your corporate credentials or use the 1-click accounts on the left.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  placeholder="admin@peoplepay360.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#714B67]/20 focus:border-[#714B67]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#714B67]/20 focus:border-[#714B67]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#714B67] hover:bg-[#5b3c53] text-white font-semibold text-sm rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>


          </form>

          <div className="mt-8 text-center text-xs text-slate-400">
            Protected with role-based access control & token expiration.
          </div>
        </div>

      </div>
    </div>
  );
}
