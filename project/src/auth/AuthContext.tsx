import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const API_BASE = 'https://api-eight-navy-68.vercel.app/api/authx/710ff547-b7c1-4287-b9e7-5045bc86cd3e';

export interface AuthUser {
  id?: string;
  email?: string;
  name?: string;
  [key: string]: unknown;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  logout: () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token');
    const storedUser = localStorage.getItem('auth_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/user/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `Login failed (${res.status})`);
    }

    const data = await res.json();
    const jwt: string = data.token || data.jwt || data.accessToken;
    if (!jwt) throw new Error('No token returned from login');

    localStorage.setItem('auth_token', jwt);
    setToken(jwt);

    // Fetch current user details
    const meRes = await fetch(`${API_BASE}/user/me`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${jwt}` },
    });

    if (!meRes.ok) {
      throw new Error(`Failed to fetch user details (${meRes.status})`);
    }

    const meData = await meRes.json();
    const userDetails: AuthUser = meData.user || meData.data || meData;
    localStorage.setItem('auth_user', JSON.stringify(userDetails));
    setUser(userDetails);
  };

  const logout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
