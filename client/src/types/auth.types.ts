export interface User {
  userId: string;
  email: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  userId: string;
  email: string;
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LogoutRequest {
  // Empty
}
