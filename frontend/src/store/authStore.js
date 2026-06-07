import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,

      setAccessToken: (token) => set({ accessToken: token }),

      setUser: (user) => set({ user }),

      login: (user, accessToken) => set({ user, accessToken }),

      logout: () => set({ user: null, accessToken: null }),

      isAuthenticated: () => !!get().accessToken,

      isRole: (role) => get().user?.role === role,
    }),
    {
      name: 'learnhub-auth',
      partialize: (state) => ({ user: state.user }),
      // Don't persist the access token — it's short-lived
    }
  )
)
