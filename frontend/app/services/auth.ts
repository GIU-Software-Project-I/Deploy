
import api from './api';

// Types matching backend response
export interface LoginRequest {
  email: string;
  password: string;
}

export interface BackendUser {
  _id: string;
  email: string;
  roles: string[];
  employeeNumber?: string;
  firstName: string;
  lastName: string;
}

export interface LoginResponse {
  message: string;
  user: BackendUser;
  userType: 'employee' | 'candidate';
  expiresIn: string;
  access_token?: string; // Optional now, since it's in a cookie
}

export interface RegisterCandidateRequest {
  firstName: string;
  lastName: string;
  middleName?: string;
  nationalId: string;
  personalEmail: string;
  password: string;
  mobilePhone: string;
}

export interface RegisterCandidateResponse {
  message: string;
  candidateId: string;
}

export interface RegisterEmployeeRequest {
  firstName: string;
  lastName: string;
  middleName?: string;
  nationalId: string;
  workEmail: string;
  password: string;
  employeeNumber: string;
  dateOfHire: string;
  roles: string[];
  mobilePhone?: string;
  personalEmail?: string;
}

export interface RegisterEmployeeResponse {
  message: string;
  employee: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeNumber: string;
    workEmail: string;
  };
}

export interface LogoutResponse {
  message: string;
}

// Auth API functions
export const authService = {
  /**
   * Login with email and password
   * Browser automatically handles the set-cookie header
   */
  async login(credentials: LoginRequest) {
    return await api.post<LoginResponse>('/auth/login', credentials);
  },

  /**
   * Get current user profile based on HttpOnly cookie
   */
  async getMe() {
    return await api.get<BackendUser>('/auth/me');
  },

  /**
   * Register a new candidate (public registration)
   */
  async registerCandidate(data: RegisterCandidateRequest) {
    return api.post<RegisterCandidateResponse>('/auth/register-candidate', data);
  },

  /**
   * Register a new employee (admin only - requires authentication)
   */
  async registerEmployee(data: RegisterEmployeeRequest) {
    return api.post<RegisterEmployeeResponse>('/auth/register-employee', data);
  },

  /**
   * Logout - backend clears the JWT cookie
   */
  async logout() {
    return await api.post<LogoutResponse>('/auth/logout');
  },
};

export default authService;
