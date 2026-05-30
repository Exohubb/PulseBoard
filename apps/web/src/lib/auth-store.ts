import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from './api';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/login', { email, password });
          const { accessToken, user } = response.data;
          set({ user, accessToken, isAuthenticated: true, isLoading: false });
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (email: string, password: string, name: string) => {
        set({ isLoading: true });
        try {
          const response = await api.post('/auth/register', { email, password, name });
          const { accessToken, user } = response.data;
          set({ user, accessToken, isAuthenticated: true, isLoading: false });
          api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        api.post('/auth/logout').catch(() => {});
        set({ user: null, accessToken: null, isAuthenticated: false });
        delete api.defaults.headers.common['Authorization'];
      },

      setLoading: (loading: boolean) => set({ isLoading: loading }),
    }),
    {
      name: 'pulseboard-auth',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Initialize API headers
const token = useAuthStore.getState().accessToken;
if (token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}