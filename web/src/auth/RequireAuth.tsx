import { Navigate, Outlet, useLocation } from 'react-router'
import type { Permission } from '@/lib/types'
import { useAuth } from './context'

export function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="p-8 text-sm text-[var(--muted)]">Loading Shopdeck…</div>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  return <Outlet />
}

export function RequirePermission({ permission, children }: { permission: Permission; children: React.ReactNode }) {
  const { can } = useAuth()
  if (!can(permission)) {
    return (
      <div className="mx-auto max-w-md p-10 text-center">
        <h2 className="text-lg font-semibold">Not available for your role</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Ask an admin if you need access to this page.</p>
      </div>
    )
  }
  return <>{children}</>
}
