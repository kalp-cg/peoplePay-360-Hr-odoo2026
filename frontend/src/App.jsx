import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';

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

function ProtectedLayout({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

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

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA]">
      <Navbar />
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/" replace /> : <LoginPage />}
      />

      <Route
        path="/"
        element={
          <ProtectedLayout>
            <Dashboard />
          </ProtectedLayout>
        }
      />

      <Route
        path="/employees"
        element={
          <ProtectedLayout>
            <Employees />
          </ProtectedLayout>
        }
      />

      <Route
        path="/employees/:id"
        element={
          <ProtectedLayout>
            <Employees />
          </ProtectedLayout>
        }
      />

      <Route
        path="/my-profile"
        element={
          <ProtectedLayout>
            <MyProfile />
          </ProtectedLayout>
        }
      />

      <Route
        path="/my-profile/:id"
        element={
          <ProtectedLayout>
            <MyProfile />
          </ProtectedLayout>
        }
      />

      <Route
        path="/contracts"
        element={
          <ProtectedLayout>
            <Contracts />
          </ProtectedLayout>
        }
      />

      <Route
        path="/contracts/:id"
        element={
          <ProtectedLayout>
            <Contracts />
          </ProtectedLayout>
        }
      />

      <Route
        path="/schedules"
        element={
          <ProtectedLayout>
            <Schedules />
          </ProtectedLayout>
        }
      />

      <Route
        path="/attendance"
        element={
          <ProtectedLayout>
            <Attendance />
          </ProtectedLayout>
        }
      />

      <Route
        path="/time-off"
        element={
          <ProtectedLayout>
            <TimeOff />
          </ProtectedLayout>
        }
      />

      <Route
        path="/payroll"
        element={
          <ProtectedLayout>
            <Payruns />
          </ProtectedLayout>
        }
      />

      <Route
        path="/payroll/payruns/:id"
        element={
          <ProtectedLayout>
            <Payruns />
          </ProtectedLayout>
        }
      />

      <Route
        path="/payroll/:id"
        element={
          <ProtectedLayout>
            <Payruns />
          </ProtectedLayout>
        }
      />

      <Route
        path="/salary-config"
        element={
          <ProtectedLayout>
            <SalaryConfig />
          </ProtectedLayout>
        }
      />

      <Route
        path="/users"
        element={
          <ProtectedLayout>
            <UsersPage />
          </ProtectedLayout>
        }
      />

      <Route
        path="/audit-logs"
        element={
          <ProtectedLayout>
            <AuditLogsPage />
          </ProtectedLayout>
        }
      />

      {/* Fallback route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
