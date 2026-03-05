import { useAuthStore } from '../../store/useAuthStore';
import { getDemoUserByRole } from '../../mocks/users';
import type { Role } from '../../types/auth';

export function useDemoAuth() {
  const { user, isAuthenticated, setUser, clearUser } = useAuthStore();

  function login(role: Role) {
    const demoUser = getDemoUserByRole(role);
    if (!demoUser) return;
    setUser(demoUser);
  }

  function logout() {
    clearUser();
  }

  return {
    login,
    logout,
    user,
    isAuthenticated,
    isLoading: false,
  };
}
