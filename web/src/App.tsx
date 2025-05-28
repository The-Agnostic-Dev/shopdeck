import { Navigate, Route, Routes } from 'react-router'
import { LoginPage } from './auth/LoginPage'
import { RequireAuth, RequirePermission } from './auth/RequireAuth'
import { AppShell } from './components/AppShell'
import { CustomerDetailPage } from './features/customers/CustomerDetailPage'
import { CustomersPage } from './features/customers/CustomersPage'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { DiscountsPage } from './features/discounts/DiscountsPage'
import { ExportsPage } from './features/exports/ExportsPage'
import { LowStockPage } from './features/inventory/LowStockPage'
import { JobsPage } from './features/jobs/JobsPage'
import { OrdersPage } from './features/orders/OrdersPage'
import { ProductDetailPage } from './features/products/ProductDetailPage'
import { ProductsPage } from './features/products/ProductsPage'
import { RefundsPage } from './features/refunds/RefundsPage'
import { SlotsPage } from './features/slots/SlotsPage'
import { StaffPage } from './features/staff/StaffPage'

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<DashboardPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/:id" element={<ProductDetailPage />} />
          <Route path="inventory/low-stock" element={<LowStockPage />} />
          <Route
            path="customers"
            element={
              <RequirePermission permission="customers:read">
                <CustomersPage />
              </RequirePermission>
            }
          />
          <Route
            path="customers/:id"
            element={
              <RequirePermission permission="customers:read">
                <CustomerDetailPage />
              </RequirePermission>
            }
          />
          <Route
            path="refunds"
            element={
              <RequirePermission permission="refunds:read">
                <RefundsPage />
              </RequirePermission>
            }
          />
          <Route path="discounts" element={<DiscountsPage />} />
          <Route path="slots" element={<SlotsPage />} />
          <Route path="exports" element={<ExportsPage />} />
          <Route
            path="staff"
            element={
              <RequirePermission permission="staff:manage">
                <StaffPage />
              </RequirePermission>
            }
          />
          <Route path="settings/jobs" element={<JobsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
