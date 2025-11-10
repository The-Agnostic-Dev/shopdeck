// Column headers for CSV exports. Finance reconciles against these, so do not
// rename a column without telling them.

export const ORDER_EXPORT_COLUMNS = [
  'Order',
  'Placed (Lagos)',
  'Customer',
  'Area',
  'Status',
  'Payment',
  'Method',
  'Subtotal (NGN)',
  'Discount (NGN)',
  'Discount code',
  'Delivery fee (NGN)',
  'Total (NGN)',
  'Refunded (NGN)',
  'Items',
] as const

export const PRODUCT_EXPORT_COLUMNS = [
  'SKU',
  'Name',
  'Brand',
  'Category',
  'Unit',
  'Price (NGN)',
  'Cost (NGN)',
  'Stock',
  'Low stock at',
  'Status',
  'Updated',
] as const

export const CUSTOMER_EXPORT_COLUMNS = [
  'Customer ID',
  'Name',
  'Email',
  'Phone',
  'Area',
  'Joined',
  'Orders',
  'Lifetime spend (NGN)',
  'Marketing opt-in',
] as const
