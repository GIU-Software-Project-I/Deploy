'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authService, BackendUser } from '@/app/services/auth';


import { SystemRole } from '@/types';

// User type stored in context
export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: SystemRole;
  roles: string[];
  employeeNumber?: string;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  nationalId: string;
  email: string;
  password: string;
  mobilePhone: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (data: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
  getDashboardRoute: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Map backend role string to SystemRole enum
function mapRole(role: string): SystemRole {
  const normalizedRole = role.toLowerCase().trim();
  const roleMap: Record<string, SystemRole> = {
    'department employee': SystemRole.DEPARTMENT_EMPLOYEE,
    'department head': SystemRole.DEPARTMENT_HEAD,
    'hr manager': SystemRole.HR_MANAGER,
    'hr employee': SystemRole.HR_EMPLOYEE,
    'payroll specialist': SystemRole.PAYROLL_SPECIALIST,
    'payroll manager': SystemRole.PAYROLL_MANAGER,
    'system admin': SystemRole.SYSTEM_ADMIN,
    'legal & policy admin': SystemRole.LEGAL_POLICY_ADMIN,
    'recruiter': SystemRole.RECRUITER,
    'finance staff': SystemRole.FINANCE_STAFF,
    'job candidate': SystemRole.JOB_CANDIDATE,
    'hr admin': SystemRole.HR_ADMIN,
  };
  return roleMap[normalizedRole] || SystemRole.DEPARTMENT_EMPLOYEE;
}

// Get dashboard route for a given role
function getDashboardRouteForRole(role: SystemRole): string {
  const routes: Record<SystemRole, string> = {
    [SystemRole.SYSTEM_ADMIN]: '/dashboard/system-admin',
    [SystemRole.HR_ADMIN]: '/dashboard/hr-admin',
    [SystemRole.HR_MANAGER]: '/dashboard/hr-manager',
    [SystemRole.HR_EMPLOYEE]: '/dashboard/hr-employee',
    [SystemRole.PAYROLL_MANAGER]: '/dashboard/payroll-manager',
    [SystemRole.PAYROLL_SPECIALIST]: '/dashboard/payroll-specialist',
    [SystemRole.FINANCE_STAFF]: '/dashboard/finance-staff',
    [SystemRole.RECRUITER]: '/dashboard/recruiter',
    [SystemRole.DEPARTMENT_HEAD]: '/dashboard/department-head',
    [SystemRole.LEGAL_POLICY_ADMIN]: '/dashboard/legal-policy-admin',
    [SystemRole.JOB_CANDIDATE]: '/dashboard/job-candidate',
    [SystemRole.DEPARTMENT_EMPLOYEE]: '/dashboard/department-employee',
  };
  return routes[role] || '/dashboard/department-employee';
}

// Transform backend user to frontend user
function transformUser(backendUser: BackendUser): User {
  const roles = backendUser.roles || [];
  const normalizedRoles = roles.map(r => r.toLowerCase().trim());

  console.log('[AuthContext] 🔄 Transforming user. Raw roles:', roles);

  // Prioritize roles: System Admin > HR Admin > HR Manager > others
  let primaryRole: SystemRole = SystemRole.DEPARTMENT_EMPLOYEE;

  if (normalizedRoles.includes('system admin')) primaryRole = SystemRole.SYSTEM_ADMIN;
  else if (normalizedRoles.includes('hr admin')) primaryRole = SystemRole.HR_ADMIN;
  else if (normalizedRoles.includes('hr manager')) primaryRole = SystemRole.HR_MANAGER;
  else if (normalizedRoles.includes('department head')) primaryRole = SystemRole.DEPARTMENT_HEAD;
  else if (roles.length > 0) {
    // Fallback to mapping the first role if no priority found
    primaryRole = mapRole(roles[0]);
  }

  console.log('[AuthContext] ✅ Primary Role assigned:', primaryRole);

  return {
    id: backendUser._id,
    firstName: backendUser.firstName,
    lastName: backendUser.lastName,
    email: backendUser.email,
    role: primaryRole,
    roles: roles,
    employeeNumber: backendUser.employeeNumber,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Load user on mount by verifying session with backend (HttpOnly Cookie)
  useEffect(() => {
    const loadUser = async () => {
      console.log('[AuthContext] Verifying session...');
      try {
        const startTime = Date.now();
        const minLoadingTime = 500;

        // Verify with backend - cookie is sent automatically
        const response = await authService.getMe();
        console.log('[AuthContext] getMe response:', response);

        if (response.data) {
          const transformed = transformUser(response.data);
          console.log('[AuthContext] User verified:', transformed);
          setUser(transformed);
        } else {
          // Session invalid or not found
          console.warn('[AuthContext] No user data in getMe response');
          setUser(null);
        }

        const elapsed = Date.now() - startTime;
        if (elapsed < minLoadingTime) {
          await new Promise(resolve => setTimeout(resolve, minLoadingTime - elapsed));
        }
      } catch (e: any) {
        console.error('[AuthContext] Failed to verify session:', e);
        if (e.response) {
          console.error('[AuthContext] Error details:', {
            status: e.response.status,
            data: e.response.data
          });
        }
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    console.log('[AuthContext] Attempting login for:', email);

    try {
      const response = await authService.login({ email, password });
      console.log('[AuthContext] Login response:', response);

      if (response.error) {
        console.error('[AuthContext] Login failed:', response.error);
        setError(response.error);
        setIsLoading(false);
        return false;
      }

      if (response.data?.user) {
        const transformedUser = transformUser(response.data.user);
        console.log('[AuthContext] Login successful, transformed user:', transformedUser);
        setUser(transformedUser);
        setIsLoading(false);
        return true;
      }

      console.error('[AuthContext] Invalid login response - missing user data');
      setError('Invalid response from server');
      setIsLoading(false);
      return false;
    } catch (err: any) {
      console.error('[AuthContext] Login error caught:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
      setIsLoading(false);
      return false;
    }
  }, []);

  const register = useCallback(async (data: RegisterData): Promise<boolean> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.registerCandidate({
        firstName: data.firstName,
        lastName: data.lastName,
        nationalId: data.nationalId,
        personalEmail: data.email,
        password: data.password,
        mobilePhone: data.mobilePhone,
      });

      if (response.error) {
        setError(response.error);
        setIsLoading(false);
        return false;
      }

      // After successful registration, login the candidate
      try {
        const loginResponse = await authService.login({
          email: data.email,
          password: data.password,
        });

        if (loginResponse.data?.user) {
          const transformedUser = transformUser(loginResponse.data.user);
          setUser(transformedUser);
          // Redirect to candidate dashboard
          router.push('/dashboard/job-candidate');
        }
      } catch (loginErr) {
        // If auto-login fails, just redirect to login page
        router.push('/login');
      }

      setIsLoading(false);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
      setIsLoading(false);
      return false;
    }
  }, [router]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await authService.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Clear user state
      setUser(null);
      setIsLoading(false);
      router.push('/login');
    }
  }, [router]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const getDashboardRoute = useCallback((): string => {
    if (!user) return '/login';
    return getDashboardRouteForRole(user.role);
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        register,
        logout,
        clearError,
        getDashboardRoute,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export { getDashboardRouteForRole };