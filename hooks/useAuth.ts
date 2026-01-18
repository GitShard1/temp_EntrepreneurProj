import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getAuthState, clearAuthState as clearAuth, AuthState } from '@/lib/auth'

/**
 * Custom hook for managing authentication state across the application
 * Automatically redirects to login page if not authenticated
 */
export function useAuth(redirectIfNotAuth: boolean = true) {
  const [authState, setAuthState] = useState<AuthState>({
    username: null,
    token: null,
    isAuthenticated: false
  })
  const router = useRouter()

  useEffect(() => {
    const state = getAuthState()
    setAuthState(state)

    if (redirectIfNotAuth && !state.isAuthenticated) {
      router.push('/')
    }
  }, [redirectIfNotAuth, router])

  const clearAuthState = () => {
    clearAuth()
    setAuthState({
      username: null,
      token: null,
      isAuthenticated: false
    })
    router.push('/')
  }

  return {
    ...authState,
    clearAuthState
  }
}
