import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import { setAuthToken, removeAuthToken, getAuthToken } from '../services/apiClient';

const AuthContext = createContext(null);
const SESSION_KEY = 'assethub_session_v1';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);

  // Sync session across browser storage
  useEffect(() => {
    if (user) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_KEY);
    }
  }, [user]);

  // Attempt to verify/refresh user session on mount if token is saved
  useEffect(() => {
    const token = getAuthToken();
    if (token && !user) {
      api.auth
        .getMe()
        .then((profile) => {
          if (profile) {
            setUser(profile.user || profile);
          }
        })
        .catch(() => {
          removeAuthToken();
        });
    }
  }, [user]);

  /**
   * Authenticate against backend API.
   */
  async function login(email, password, remember = true) {
    setLoading(true);
    try {
      const response = await api.auth.login({
        email: email.trim(),
        password,
      });

      const token = response?.token || response?.accessToken || response?.data?.token;
      const userProfile = response?.user || response?.data?.user || {
        email: email.trim(),
        name: response?.name || email.split('@')[0],
        role: response?.role || 'User',
      };

      if (token) {
        setAuthToken(token, remember);
      }

      setUser({
        ...userProfile,
        loggedInAt: new Date().toISOString(),
      });

      return { ok: true, user: userProfile };
    } catch (err) {
      return {
        ok: false,
        message: err.message || 'Authentication failed. Please verify your credentials.',
      };
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    api.auth.logout();
    removeAuthToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, demoUsers: [] }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
