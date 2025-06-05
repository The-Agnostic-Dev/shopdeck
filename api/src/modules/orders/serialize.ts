import { can } from '../../auth/permissions.js'
import type { StaffUser } from '../../db/schema/index.js'
import { formatPhone } from '../../lib/format.js'
import type { historyFor } from '../audit/service.js'
import type { orderDetail } from './repo.js'
import { STATUS_LABELS, TRANSITIONS } from './service.js'

type Detail = NonNullable<Awaited<ReturnType<typeof orderDetail>>>
type History = Awaited<ReturnType<typeof historyFor>>

export function serializeOrderDetail(detail: Detail, history: History, viewer: StaffUser) {
  const { order, customer } = detail
  const showContact = can(viewer.role, 'customers:contact')
  const refundable = order.totalKobo - order.refundedKobo
  return {
    order: {
      ...order,
      statusLabel: STATUS_LABELS[order.status],
      nextStatuses: TRANSITIONS[order.status],
      refundableKobo: Math.max(0, refundable),
      discountCode: detail.discountCode,
      pickerName: detail.pickerName,
      slot: detail.slot,
    },
    customer: {
      id: customer.id,
      name: customer.name,
      area: customer.area,
      email: showContact ? customer.email : null,
      phone: showContact ? formatPhone(customer.phone) : null,
    },
    items: detail.items,
    refunds: detail.refunds,
    history,
  }
}
