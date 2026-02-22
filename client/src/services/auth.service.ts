import api from "./api";
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
} from "~/src/types/auth.types";

export const authService = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    try {
      const { data } = await api.post<AuthResponse>("/auth/login", credentials);
      return data;
    } catch (error: unknown) {
      console.error("Auth service login error:", error);
      throw error;
    }
  },

  register: async (credentials: RegisterRequest): Promise<AuthResponse> => {
    try {
      const { data } = await api.post<AuthResponse>(
        "/auth/register",
        credentials,
      );
      return data;
    } catch (error: unknown) {
      console.error("Auth service register error:", error);
      throw error;
    }
  },

  logout: async (): Promise<void> => {
    try {
      await api.post("/auth/logout");
    } catch (error: unknown) {
      console.error("Auth service logout error:", error);
      throw error;
    }
  },
};
