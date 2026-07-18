import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/shared/ProtectedRoute';
import { Navbar } from './components/shared/Navbar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import BookingPage from './pages/BookingPage';
import AiChatWidget from './components/shared/AiChatWidget'; // Import the global floating AI widget so it renders on every page.
import { useAuth } from './context/AuthContext';

const NotFound = () => (
  <div className="flex flex-col items-center justify-center p-16 text-center h-[calc(100vh-4rem)]">
    <h1 className="text-6xl font-bold text-slate-800 tracking-tight">404</h1>
    <p className="text-xl text-slate-500 mt-4">Page not found</p>
    <a href="/" className="mt-8 bg-primary text-white font-medium px-6 py-3 rounded-xl hover:bg-primary-dark transition-colors shadow-sm cursor-pointer">
      Go back home
    </a>
  </div>
);

function AppContent() {
  const { user } = useAuth();

  return (
    <Router>
      <NavbarWrapper user={user} />
    </Router>
  );
}

function NavbarWrapper({ user }) {
  const location = useLocation();
  const isDashboard = ['/patient/', '/doctor/', '/admin/'].some(p => location.pathname.startsWith(p));

  return (
    <div className="min-h-screen bg-background flex flex-col font-sans text-textPrimary">
      {!isDashboard && <Navbar />}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/patient/dashboard" element={<ProtectedRoute allowedRoles={['patient']}><PatientDashboard /></ProtectedRoute>} />
          <Route path="/patient/book/:id" element={<ProtectedRoute allowedRoles={['patient']}><BookingPage /></ProtectedRoute>} />
          <Route path="/patient/doctors" element={<ProtectedRoute allowedRoles={['patient']}><PatientDashboard /></ProtectedRoute>} />
          <Route path="/doctor/dashboard" element={<ProtectedRoute allowedRoles={['doctor']}><DoctorDashboard /></ProtectedRoute>} />
          <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      {user?.role === 'patient' && <AiChatWidget />} {/* Render only for patients. */}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
