// Authentication utility functions

export interface AuthState {
  username: string | null
  token: string | null
  isAuthenticated: boolean
}

/**
 * Get the current authentication state from localStorage
 */
export function getAuthState(): AuthState {
  if (typeof window === 'undefined') {
    return { username: null, token: null, isAuthenticated: false }
  }

  const username = localStorage.getItem('username')
  const token = localStorage.getItem('auth_token')

  return {
    username,
    token,
    isAuthenticated: !!(username && token)
  }
}

/**
 * Save authentication state to localStorage
 */
export function setAuthState(username: string, token: string): void {
  localStorage.setItem('username', username)
  localStorage.setItem('auth_token', token)
}

/**
 * Clear authentication state from localStorage
 */
export function clearAuthState(): void {
  localStorage.removeItem('username')
  localStorage.removeItem('auth_token')
}

/**
 * Get authorization header for API requests
 */
export function getAuthHeader(): HeadersInit {
  const { token } = getAuthState()
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}
