import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuthStore } from '../../store/useAuthStore';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';
import { MfaSetupGate } from './MfaSetupGate';

export function ProtectedRoute() {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-[var(--color-primary,#3D3BF3)]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  // Ley 21.719: privacy policy must be accepted before using the platform
  const showPrivacy = user && !user.privacyAccepted;

  // MFA enforcement: role requires MFA but user hasn't set it up
  // Allow access to profile page (where MFA setup lives) so user can configure it
  const isProfilePage = location.pathname === '/profile';
  const showMfaGate = user?.requireMfaSetup && !isProfilePage;

  return (
    <>
      {showPrivacy && <PrivacyPolicyModal />}
      {!showPrivacy && showMfaGate && <MfaSetupGate />}
      <Outlet />
    </>
  );
}
