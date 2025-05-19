import { createContext, useContext } from 'react'
import type { Permission, SessionUser } from '@/lib/types'

export interface AuthState {
  user: SessionUser | null
  loading: boolean
  can: (permission: Permission) => boolean
  login: (email: string, password: string) => Promise<SessionUser>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
