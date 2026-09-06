import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { atLeast } from './utils/roles';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Contracts from './pages/Contracts';
import Schedules from './pages/Schedules';
import Attendance from './pages/Attendance';
import TimeOff from './pages/TimeOff';
import Payruns from './pages/Payruns';
import SalaryConfig from './pages/SalaryConfig';
import UsersPage from './pages/UsersPage';
import AuditLogsPage from './pages/AuditLogsPage';
import LoginPage from './pages/LoginPage';
import MyProfile from './pages/MyProfile';
import AccessDenied from './pages/AccessDenied';
import NotFound from './pages/NotFound';

/**
 * Wraps every signed-in page with the chrome, and enforces the role hierarchy
 * from section 3 of the specification at the route level.
 *
 * `minRole` matters as much as hiding a sidebar link: without it a user who
 * types the URL directly still renders the page, and the screen shows its own
 * empty state ("Total Accounts 0") rather than telling them they lack access.
 */
function ProtectedLayout({ children, minRole = 'EMPLOYEE', resource }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#714B67] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Loading PeoplePay360...
          </span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const permitted = atLeast(user.role, minRole);

  return (
    <div className="min-h-screen flex bg-[#F8F9FA] overflow-x-hidden">
      {/* Fixed Non-Moving Left Sidebar */}
      <Sidebar open={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />

      {/* Main Content: Left-padded for static sidebar, right part scrolls smoothly */}
      <div className="flex-1 flex flex-col md:pl-64 min-h-screen w-full min-w-0 transition-all">
        <TopHeader onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />
        <main className="flex-1 flex flex-col min-w-0">
          {permitted ? (
            <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>
          ) : (
            <AccessDenied requiredRole={minRole} resource={resource} />
          )}
        </main>
      </div>
    </div>
  );
}

/** Declarative route table so every page's minimum role is visible in one place. */
const ROUTES = [
  { path: '/', element: <Dashboard />, minRole: 'EMPLOYEE' },
  { path: '/employees', element: <Employees />, minRole: 'EMPLOYEE' },
  { path: '/employees/:id', element: <Employees />, minRole: 'EMPLOYEE' },
  { path: '/my-profile', element: <MyProfile />, minRole: 'EMPLOYEE' },
  { path: '/my-profile/:id', element: <MyProfile />, minRole: 'EMPLOYEE' },
  { path: '/attendance', element: <Attendance />, minRole: 'EMPLOYEE' },
  { path: '/time-off', element: <TimeOff />, minRole: 'EMPLOYEE' },

  { path: '/contracts', element: <Contracts />, minRole: 'HR_MANAGER', resource: 'Contracts' },
  { path: '/contracts/:id', element: <Contracts />, minRole: 'HR_MANAGER', resource: 'Contracts' },
  { path: '/schedules', element: <Schedules />, minRole: 'HR_MANAGER', resource: 'Working Schedules' },

  { path: '/payroll', element: <Payruns />, minRole: 'HR_PAYROLL_USER', resource: 'Payroll & Payruns' },
  { path: '/payroll/payruns/:id', element: <Payruns />, minRole: 'HR_PAYROLL_USER', resource: 'Payroll & Payruns' },
  { path: '/payroll/:id', element: <Payruns />, minRole: 'HR_PAYROLL_USER', resource: 'Payroll & Payruns' },
  { path: '/salary-config', element: <SalaryConfig />, minRole: 'HR_PAYROLL_USER', resource: 'Salary Structures & Rules' },

  { path: '/users', element: <UsersPage />, minRole: 'ADMIN', resource: 'Users & Access Control' },
  { path: '/audit-logs', element: <AuditLogsPage />, minRole: 'ADMIN', resource: 'Audit Logs' },
];

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LoginPage />}
      />

      {ROUTES.map(({ path, element, minRole, resource }) => (
        <Route
          key={path}
          path={path}
          element={
            <ProtectedLayout minRole={minRole} resource={resource}>
              {element}
            </ProtectedLayout>
          }
        />
      ))}

      {/* Unknown URLs get a real 404 rather than a silent redirect. */}
      <Route
        path="*"
        element={
          <ProtectedLayout>
            <NotFound />
          </ProtectedLayout>
        }
      />
    </Routes>
  );
}
