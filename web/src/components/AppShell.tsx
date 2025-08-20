import {
  BadgePercent,
  Boxes,
  CalendarClock,
  ClipboardList,
  FileDown,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageSearch,
  ReceiptText,
  Settings2,
  Users,
  UserCog,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { useAuth } from '@/auth/context'
import type { Permission } from '@/lib/types'
import { cn } from '@/lib/utils'
import { initials } from '@/lib/format'

const NAV: { to: string; label: string; icon: typeof LayoutDashboard; permission: Permission }[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, permission: 'dashboard:read' },
  { to: '/orders', label: 'Orders', icon: ClipboardList, permission: 'orders:read' },
  { to: '/products', label: 'Products', icon: PackageSearch, permission: 'products:read' },
  { to: '/inventory/low-stock', label: 'Low stock', icon: Boxes, permission: 'products:read' },
  { to: '/customers', label: 'Customers', icon: Users, permission: 'customers:read' },
  { to: '/refunds', label: 'Refunds', icon: ReceiptText, permission: 'refunds:read' },
  { to: '/discounts', label: 'Discount codes', icon: BadgePercent, permission: 'discounts:read' },
  { to: '/slots', label: 'Delivery slots', icon: CalendarClock, permission: 'slots:read' },
  { to: '/exports', label: 'Exports', icon: FileDown, permission: 'exports:create' },
  { to: '/staff', label: 'Staff & roles', icon: UserCog, permission: 'staff:manage' },
  { to: '/settings/jobs', label: 'Background jobs', icon: Settings2, permission: 'jobs:read' },
]

export function AppShell() {
  const { user, can, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const items = NAV.filter((n) => can(n.permission))

  const nav = (
    <nav className="flex flex-col gap-0.5 p-3">
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-brand-100 hover:bg-white/10',
              isActive && 'bg-white/15 font-medium text-white',
            )
          }
        >
          <Icon className="size-4" />
          {label}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col bg-brand-900 lg:flex">
        <div className="flex items-center gap-2 px-5 py-5 text-white">
          <img src="/favicon.svg" alt="" className="size-7" />
          <span className="font-semibold">Shopdeck</span>
        </div>
        {nav}
      </aside>
      {open && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setOpen(false)}>
          <aside className="h-full w-64 bg-brand-900" onClick={(e) => e.stopPropagation()}>
            {nav}
          </aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-[var(--border)] bg-white px-4">
          <button className="rounded p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          <div className="text-sm text-[var(--muted)] max-lg:hidden">Ọjà Fresh · Lagos</div>
          <div className="flex items-center gap-3">
            <div className="text-right text-sm leading-tight">
              <div className="font-medium" data-testid="current-user">
                {user?.name}
              </div>
              <div className="text-xs text-[var(--muted)]">{user?.roleLabel}</div>
            </div>
            <div className="flex size-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-900">
              {initials(user?.name ?? '')}
            </div>
            <button
              className="rounded p-2 text-[var(--muted)] hover:bg-brand-50"
              aria-label="Sign out"
              onClick={async () => {
                await logout()
                navigate('/login')
              }}
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </header>
        <main className="min-w-0 flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
