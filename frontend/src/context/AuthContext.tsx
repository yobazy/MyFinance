import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { apiUrl } from '../config/api';

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (provider: 'google' | 'github') => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  getAccessToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(
    localStorage.getItem('access_token')
  );
  const [refreshTokenValue, setRefreshTokenValue] = useState<string | null>(
    localStorage.getItem('refresh_token')
  );

  // Set up axios interceptor to include token in requests
  useEffect(() => {
    const interceptor = axios.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle 401 errors
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Try to refresh token
          const refresh = localStorage.getItem('refresh_token');
          if (refresh) {
            try {
              const response = await axios.post(apiUrl('auth/refresh/'), {
                refresh_token: refresh,
              });
              const newAccessToken = response.data.access_token;
              localStorage.setItem('access_token', newAccessToken);
              setAccessToken(newAccessToken);
              // Retry original request
              error.config.headers.Authorization = `Bearer ${newAccessToken}`;
              return axios.request(error.config);
            } catch (refreshError) {
              // Refresh failed, logout
              await logout();
            }
          } else {
            await logout();
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(interceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []);

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const response = await axios.get(apiUrl('auth/user/'), {
            headers: { Authorization: `Bearer ${token}` },
          });
          setUser(response.data);
        } catch (error) {
          // Token invalid, clear it
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setAccessToken(null);
          setRefreshTokenValue(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (provider: 'google' | 'github') => {
    try {
      const response = await axios.get(apiUrl(`auth/login/${provider}/`));
      const authUrl = response.data.auth_url;
      window.location.href = authUrl;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const refresh = localStorage.getItem('refresh_token');
      if (refresh) {
        await axios.post(
          apiUrl('auth/logout/'),
          { refresh_token: refresh },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('access_token')}`,
            },
          }
        );
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setAccessToken(null);
      setRefreshTokenValue(null);
      setUser(null);
    }
  };

  const refreshToken = async () => {
    const refresh = localStorage.getItem('refresh_token');
    if (!refresh) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post(apiUrl('auth/refresh/'), {
        refresh_token: refresh,
      });
      const newAccessToken = response.data.access_token;
      localStorage.setItem('access_token', newAccessToken);
      setAccessToken(newAccessToken);
      return newAccessToken;
    } catch (error) {
      await logout();
      throw error;
    }
  };

  const getAccessToken = () => {
    return localStorage.getItem('access_token');
  };

  // Handle OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');

    if (accessToken && refreshToken) {
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      setAccessToken(accessToken);
      setRefreshTokenValue(refreshToken);

      // Fetch user info
      axios
        .get(apiUrl('auth/user/'), {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        .then((response) => {
          setUser(response.data);
          // Clean up URL
          window.history.replaceState({}, '', window.location.pathname);
        })
        .catch((error) => {
          console.error('Error fetching user info:', error);
        });
    }
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshToken,
    getAccessToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
