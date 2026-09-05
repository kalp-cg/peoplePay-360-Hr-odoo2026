import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

const p = (prefix, suffix = '123') => `${prefix}@${suffix}`;

export const DEMO_ACCOUNTS = [
  { role: 'ADMIN', name: 'System Admin', email: 'admin@peoplepay360.com', pass: p('Admin'), label: 'Admin (Full Access)' },
  { role: 'HR_MANAGER', name: 'Kavita Deshmukh', email: 'hrmanager@peoplepay360.com', pass: p('HR'), label: 'HR Manager (HR & Leaves)' },
  { role: 'HR_PAYROLL_USER', name: 'Rohan Joshi', email: 'payrolluser@peoplepay360.com', pass: p('Payroll'), label: 'HR Payroll User (Compute & Slips)' },
  { role: 'HR_PAYROLL_MANAGER', name: 'Rohan Head', email: 'payrollmgr@peoplepay360.com', pass: p('PayrollMgr'), label: 'Payroll Manager (Full Payroll)' },
  { role: 'EMPLOYEE', name: 'Rahul Sharma', email: 'rahul@peoplepay360.com', pass: p('Rahul'), label: 'Employee (Self Service)' },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
    } catch (err) {
      console.warn('Session expired or invalid token, clearing session:', err);
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email, password) {
    const res = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    return res.data.user;
  }

  async function quickLogin(email, password) {
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      setUser(res.data.user);
      return res.data.user;
    } catch (err) {
      console.error('Quick login failed:', err);
    }
  }

  function logout() {
    localStorage.removeItem('token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, quickLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
