import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'

/** Deterministic session states for QA automation (`data-auth-status`). */
export const AUTH_STATUS = {
  IDLE: 'idle',
  AUTHENTICATING: 'authenticating',
  AUTHENTICATED: 'authenticated',
  UNAUTHENTICATED: 'unauthenticated',
}

/** Platform roles — matches backend `UserRole` enum values. */
export const ROLES = {
  STUDENT: 'student',
  MENTOR: 'mentor',
  ADMIN: 'admin',
}

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      authStatus: AUTH_STATUS.IDLE,

      setAuthStatus: (authStatus) => set({ authStatus }),

      setAccessToken: (token) =>
        set({
          accessToken: token,
          authStatus: token ? AUTH_STATUS.AUTHENTICATED : get().authStatus,
        }),

      setUser: (user) => set({ user }),

      login: (user, accessToken) =>
        set({
          user,
          accessToken,
          authStatus: AUTH_STATUS.AUTHENTICATED,
        }),

      logout: () =>
        set({
          user: null,
          accessToken: null,
          authStatus: AUTH_STATUS.UNAUTHENTICATED,
        }),

      /** True only when bootstrap/refresh completed and a token is present. */
      isAuthenticated: () =>
        get().authStatus === AUTH_STATUS.AUTHENTICATED && !!get().accessToken,

      hasRole: (role) => get().user?.role === role,

      /** Returns true when `roles` is empty or the current user role is listed. */
      hasAnyRole: (roles = []) => {
        if (!roles.length) return true
        const userRole = get().user?.role
        return Boolean(userRole && roles.includes(userRole))
      },

      /** @deprecated Prefer `hasRole` */
      isRole: (role) => get().user?.role === role,
    }),
    {
      name: 'Polaris-auth',
      partialize: (state) => ({ user: state.user }),
      // Access token stays in memory only — short-lived, refreshed via HttpOnly cookie.
      onRehydrateStorage: () => (state, error) => {
        if (error || !state) return
        state.setAuthStatus(
          state.user ? AUTH_STATUS.IDLE : AUTH_STATUS.UNAUTHENTICATED,
        )
      },
    },
  ),
)

/**
 * Restore session on cold load: persisted user + HttpOnly refresh cookie → access token.
 * Safe to call once at app mount; concurrent callers share the same in-flight promise.
 */
let bootstrapPromise = null

export function bootstrapAuthSession() {
  if (bootstrapPromise) return bootstrapPromise

  bootstrapPromise = (async () => {
    const store = useAuthStore.getState()

    if (store.accessToken && store.user) {
      store.setAuthStatus(AUTH_STATUS.AUTHENTICATED)
      return true
    }

    if (!store.user) {
      store.setAuthStatus(AUTH_STATUS.UNAUTHENTICATED)
      return false
    }

    store.setAuthStatus(AUTH_STATUS.AUTHENTICATING)

    try {
      const { data } = await axios.post(
        '/api/v1/auth/refresh',
        {},
        { withCredentials: true },
      )
      store.setAccessToken(data.access_token)
      store.setAuthStatus(AUTH_STATUS.AUTHENTICATED)
      return true
    } catch {
      store.logout()
      return false
    }
  })().finally(() => {
    bootstrapPromise = null
  })

  return bootstrapPromise
}
