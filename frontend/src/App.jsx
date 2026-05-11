import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth';
import { ThemeProvider } from './lib/theme';
import Landing from './pages/Landing';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import Leaderboard from './pages/Leaderboard';
import Stars from './pages/Stars';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';

import RootLayout from './components/RootLayout';

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    const hasToken = !!localStorage.getItem('devscore_token');

    // Only show full-screen spinner if we're loading AND don't even have a token to start with
    // If we have a token, we assume authentication is valid until the background check completes
    if (loading && !hasToken) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-ds-bg dot-grid">
                <div className="noise-overlay" />
                <div className="w-8 h-8 border-2 border-white/5 border-t-ds-brand rounded-full animate-spin" />
            </div>
        );
    }

    if (!loading && !user) {
        return <Navigate to="/" />;
    }

    return children;
}

function AppRoutes() {
    return (
        <Routes>
            <Route element={<RootLayout />}>
                <Route path="/" element={<Landing />} />
                <Route path="/leaderboard" element={<Leaderboard />} />
                <Route path="/stars" element={<Stars />} />
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />
                <Route path="/admin" element={<AdminLogin />} />
                <Route
                    path="/admin/dashboard"
                    element={
                        <ProtectedRoute>
                            <AdminDashboard />
                        </ProtectedRoute>
                    }
                />
                <Route path="*" element={<Navigate to="/" />} />
            </Route>
            <Route path="/auth/callback" element={<AuthCallback />} />
        </Routes>
    );
}

export default function App() {
    return (
        <ThemeProvider>
            <AuthProvider>
                <AppRoutes />
            </AuthProvider>
        </ThemeProvider>
    );
}
