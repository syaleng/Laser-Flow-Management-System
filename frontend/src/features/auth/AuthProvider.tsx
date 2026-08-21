import {
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { queryClient } from "@/app/query-client";
import { registerUnauthorizedHandler, setAccessToken } from "@/lib/api-client";
import type { User, UserRole } from "@/types/api";

import * as authService from "./auth-service";
import { AuthContext, type LoginInput } from "./auth-context";
import { type Permission, userHasPermission, userHasRole } from "./permissions";

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    queryClient.clear();
  }, []);

  useEffect(() => {
    registerUnauthorizedHandler(clearSession);
    authService
      .loadCurrentUser()
      .then(setUser)
      .catch(clearSession)
      .finally(() => setLoading(false));

    return () => registerUnauthorizedHandler(null);
  }, [clearSession]);

  const login = useCallback(async (input: LoginInput) => {
    setUser(await authService.login(input));
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const hasRole = useCallback(
    (...roles: UserRole[]) => userHasRole(user, ...roles),
    [user],
  );
  const hasPermission = useCallback(
    (permission: Permission) => userHasPermission(user, permission),
    [user],
  );

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user?.is_active),
      loading,
      isLoading: loading,
      login,
      logout,
      hasRole,
      hasPermission,
    }),
    [user, loading, login, logout, hasRole, hasPermission],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

