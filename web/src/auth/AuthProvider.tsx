import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, type ReactNode } from 'react'
import { api, ApiError } from '@/lib/api'
import type { Permission, SessionUser } from '@/lib/types'
import { AuthContext, type AuthState } from './context'

const ME_KEY = ['auth', 'me'] as const

async function fetchMe(): Promise<SessionUser | null> {
  try {
    const { user } = await api.get<{ user: SessionUser }>('/auth/me')
    return user
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null
    throw err
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const me = useQuery({ queryKey: ME_KEY, queryFn: fetchMe, staleTime: 5 * 60_000, retry: false })

  useEffect(() => {
    const onSignedOut = () => queryClient.setQueryData(ME_KEY, null)
    window.addEventListener('shopdeck:signed-out', onSignedOut)
    return () => window.removeEventListener('shopdeck:signed-out', onSignedOut)
  }, [queryClient])

  const login = useCallback(
    async (email: string, password: string) => {
      const { user } = await api.post<{ user: SessionUser }>('/auth/login', { email, password })
      queryClient.clear()
      queryClient.setQueryData(ME_KEY, user)
      return user
    },
    [queryClient],
  )

  const logout = useCallback(async () => {
    await api.post('/auth/logout')
    queryClient.clear()
    queryClient.setQueryData(ME_KEY, null)
  }, [queryClient])

  const value = useMemo<AuthState>(() => {
    const user = me.data ?? null
    return {
      user,
      loading: me.isPending,
      can: (permission: Permission) => !!user?.permissions.includes(permission),
      login,
      logout,
    }
  }, [me.data, me.isPending, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
