"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import {
  authApi,
  usersApi,
  getAuthToken,
  setAuthToken,
  removeAuthToken,
  getTokenPayload,
  getRefreshToken,
  setRefreshToken,
  removeRefreshToken,
  setTokenExpiry,
  type LoginRequest,
  type RegisterRequest,
  type UserResponse,
} from "@/lib/api";

interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  phone?: string;
  location?: string;
  avatar?: string;
  trustScore?: number;
  objectsFound?: number;
  objectsLost?: number;
  matches?: number;
  verified?: boolean;
  walletBalance?: number;
  banned?: boolean;
  banReason?: string;
  bannedAt?: string;
  createdAt: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isBanned: boolean;
  login: (data: LoginRequest) => Promise<void>;
  /** Connexion 2FA : établit la session à partir des tokens déjà reçus après vérification OTP. */
  loginWithTokens: (response: {
    token: string;
    refreshToken: string;
    expiresIn?: number;
    email?: string;
    role?: string;
    id?: number;
    name?: string;
  }) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const storedToken = getAuthToken();
    if (storedToken) {
      setToken(storedToken);
      const payload = getTokenPayload();
      if (payload) {
        // Build a minimal user from token payload
        setUser({
          id: Number(localStorage.getItem("retrouvit_user_id")) || 0,
          name: payload.email.split("@")[0],
          email: payload.email,
          role: payload.role,
          createdAt: new Date().toISOString(),
        });
        // Try to fetch full user data (uses /api/auth/me when id is missing)
        fetchCurrentUser();
      }
    }
    setIsLoading(false);
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const storedUserId = localStorage.getItem("retrouvit_user_id");
      let userData;
      if (storedUserId && storedUserId !== "0") {
        userData = await usersApi.getMe(Number(storedUserId));
      } else {
        // Fallback: use /api/auth/me to get user from JWT token
        userData = await usersApi.getMeFromToken();
        localStorage.setItem("retrouvit_user_id", String(userData.id));
      }
      setUser({
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        phone: userData.phone,
        location: userData.location,
        avatar: userData.avatar,
        trustScore: userData.trustScore,
        objectsFound: userData.objectsFound,
        objectsLost: userData.objectsLost,
        matches: userData.matches,
        verified: userData.verified,
        walletBalance: userData.walletBalance,
        banned: userData.banned,
        banReason: userData.banReason,
        bannedAt: userData.bannedAt,
        createdAt: userData.createdAt,
      });
    } catch (error) {
      console.warn("Could not fetch user data:", error);
    }
  };

  const login = useCallback(async (data: LoginRequest) => {
    const response = await authApi.login(data);
    if (!response.token || !response.refreshToken) {
      throw new Error("Réponse de connexion invalide");
    }
    setAuthToken(response.token);
    setRefreshToken(response.refreshToken);
    if (response.expiresIn) setTokenExpiry(response.expiresIn);
    setToken(response.token);

    // Use id and name from login response if available, otherwise decode from token
    if (response.id) {
      localStorage.setItem("retrouvit_user_id", String(response.id));
      setUser({
        id: response.id,
        name: response.name || (response.email ?? data.email).split("@")[0],
        email: response.email ?? data.email,
        role: response.role ?? "USER",
        createdAt: new Date().toISOString(),
      });
    } else {
      const payload = getTokenPayload();
      if (payload) {
        setUser({
          id: 0,
          name: payload.email.split("@")[0],
          email: payload.email,
          role: payload.role,
          createdAt: new Date().toISOString(),
        });
      }
    }
  }, []);

  /**
   * Connexion 2FA (CDC §6.1) : le code OTP a déjà été validé côté backend
   * et les tokens ont été reçus — on établit la session sans re-soumettre
   * le mot de passe.
   */
  const loginWithTokens = useCallback(
    async (response: {
      token: string;
      refreshToken: string;
      expiresIn?: number;
      email?: string;
      role?: string;
      id?: number;
      name?: string;
    }) => {
      setAuthToken(response.token);
      setRefreshToken(response.refreshToken);
      if (response.expiresIn) setTokenExpiry(response.expiresIn);
      setToken(response.token);

      if (response.id) {
        localStorage.setItem("retrouvit_user_id", String(response.id));
      }
      const payload = getTokenPayload();
      if (payload) {
        setUser({
          id: response.id ?? Number(localStorage.getItem("retrouvit_user_id")) ?? 0,
          name: response.name ?? payload.email.split("@")[0],
          email: response.email ?? payload.email,
          role: response.role ?? payload.role,
          createdAt: new Date().toISOString(),
        });
      }
    },
    []
  );

  const register = useCallback(async (data: RegisterRequest) => {
    const response = await authApi.register(data);
    localStorage.setItem("retrouvit_user_id", String(response.id));

    // Set user from registration response
    setUser({
      id: response.id,
      name: response.name,
      email: response.email,
      role: response.role,
      createdAt: response.createdAt,
    });

    // Auto-login after registration
    await login({ email: data.email, password: data.password });
  }, [login]);

  const logout = useCallback(async () => {
    // Notify backend to revoke refresh token
    const refreshToken = getRefreshToken();
    try {
      await authApi.logout(refreshToken);
    } catch {
      // Best effort — continue with local cleanup even if API call fails
    }
    removeAuthToken();
    removeRefreshToken();
    localStorage.removeItem("retrouvit_token_expiry");
    localStorage.removeItem("retrouvit_user_id");
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    await fetchCurrentUser();
  }, []);

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    isAdmin: user?.role === "ADMIN",
    isBanned: user?.banned ?? false,
    login,
    loginWithTokens,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
