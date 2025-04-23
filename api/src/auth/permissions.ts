import type { Role } from '../db/schema/index.js'

export const PERMISSIONS = [
  'dashboard:read',
  'orders:read',
  'orders:update_status',
  'orders:cancel',
  'orders:substitute',
  'refunds:read',
  'refunds:create',
  'products:read',
  'products:write',
  'inventory:adjust',
  'customers:read',
  'customers:write',
  'customers:contact',
  'discounts:read',
  'discounts:write',
  'slots:read',
  'slots:write',
  'exports:create',
  'staff:manage',
  'jobs:read',
] as const

export type Permission = (typeof PERMISSIONS)[number]

const everyone: Permission[] = ['dashboard:read', 'orders:read', 'products:read', 'slots:read']

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  admin: [...PERMISSIONS],
  ops_lead: [
    ...everyone,
    'orders:update_status',
    'orders:cancel',
    'orders:substitute',
    'refunds:read',
    'products:write',
    'inventory:adjust',
    'customers:read',
    'customers:contact',
    'discounts:read',
    'slots:write',
    'exports:create',
  ],
  picker: [...everyone, 'orders:update_status', 'orders:substitute', 'inventory:adjust'],
  customer_care: [
    ...everyone,
    'orders:cancel',
    'refunds:read',
    'refunds:create',
    'customers:read',
    'customers:write',
    'customers:contact',
    'discounts:read',
  ],
  finance: [...everyone, 'refunds:read', 'refunds:create', 'customers:read', 'customers:contact', 'discounts:read', 'exports:create'],
}

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Admin',
  ops_lead: 'Ops lead',
  picker: 'Picker',
  customer_care: 'Customer care',
  finance: 'Finance',
}

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}
