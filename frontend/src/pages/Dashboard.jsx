import React from 'react';
import { useAuth } from '../context/AuthContext';
import EmployeeDashboard from './dashboards/EmployeeDashboard';
import HRManagerDashboard from './dashboards/HRManagerDashboard';
import PayrollDashboard from './dashboards/PayrollDashboard';

export default function Dashboard() {
  const { user } = useAuth();

  // Role-Wise Dashboard Routing
  if (user?.role === 'EMPLOYEE') {
    return <EmployeeDashboard />;
  }

  if (user?.role === 'HR_PAYROLL_USER' || user?.role === 'HR_PAYROLL_MANAGER') {
    return <PayrollDashboard />;
  }

  // Default for ADMIN, HR_MANAGER, and other executive roles
  return <HRManagerDashboard />;
}
