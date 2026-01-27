import { AuthPage } from './components/auth-page';
import { StudentDashboard } from './components/student-dashboard';
import { InstructorDashboard } from './components/instructor-dashboard';
import { AdminDashboard } from './components/admin-dashboard';
import { AuthProvider, useAuth } from '@/lib/auth-context';
import { RouteGuard } from '@/lib/route-guard';
import { Toaster } from './components/ui/sonner';

function AppContent() {
  const { user, profile, loading, signOut, session } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <>
        <AuthPage />
        <Toaster />
      </>
    );
  }

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const accessToken = session?.access_token || '';

  // Role-based dashboard routing
  if (profile.role === 'admin') {
    return (
      <RouteGuard allowedRoles={['admin']}>
        <AdminDashboard
          accessToken={accessToken}
          userProfile={profile}
          onLogout={handleLogout}
        />
        <Toaster />
      </RouteGuard>
    );
  }

  if (profile.role === 'instructor') {
    return (
      <RouteGuard allowedRoles={['instructor']}>
        <InstructorDashboard
          accessToken={accessToken}
          userProfile={profile}
          onLogout={handleLogout}
        />
        <Toaster />
      </RouteGuard>
    );
  }

  return (
    <RouteGuard allowedRoles={['student']}>
      <StudentDashboard
        accessToken={accessToken}
        userProfile={profile}
        onLogout={handleLogout}
      />
      <Toaster />
    </RouteGuard>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}