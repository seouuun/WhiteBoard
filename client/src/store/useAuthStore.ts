import { create } from 'zustand';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface Guest {
  id: string;
  nickname: string;
}

interface AuthState {
  token: string | null;
  guest: Guest | null;
  loading: boolean;
  error: string | null;
  loginAsGuest: (nickname: string) => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  guest: localStorage.getItem('guest') ? JSON.parse(localStorage.getItem('guest') as string) : null,
  loading: false,
  error: null,

  loginAsGuest: async (nickname: string) => {
    set({ loading: true, error: null });
    try {
      const res = await axios.post(`${API_URL}/auth/guest`, { nickname });
      const { token, guest } = res.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('guest', JSON.stringify(guest));
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      set({ token, guest, loading: false });
    } catch (error) {
      console.error(error);
      set({ error: '인증에 실패했습니다.', loading: false });
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('guest');
    delete axios.defaults.headers.common['Authorization'];
    set({ token: null, guest: null });
  }
}));

// Initialize axios token if it exists on load
const initialToken = localStorage.getItem('token');
if (initialToken) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${initialToken}`;
}
