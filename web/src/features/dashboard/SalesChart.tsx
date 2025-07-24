import { weekdayShort } from '@/lib/dates'
import { formatMoney } from '@/lib/money'
import type { DashboardData } from './api'

/** Plain SVG bars: fourteen points do not need a chart library. */
export function SalesChart({ series }: { series: DashboardData['series'] }) {
  const max = Math.max(1, ...series.map((s) => s.netSalesKobo))
  const w = 640
  const h = 180
  const gap = 6
  const bar = (w - gap * (series.length - 1)) / series.length
  return (
    <figure>
      <svg viewBox={`0 0 ${w} ${h + 24}`} className="w-full" role="img" aria-label="Net sales per day">
        {series.map((s, i) => {
          const bh = Math.max(2, (s.netSalesKobo / max) * h)
          const x = i * (bar + gap)
          return (
            <g key={s.day} data-day={s.day} data-orders={s.orders} data-net-sales={s.netSalesKobo}>
              <rect
                x={x}
                y={h - bh}
                width={bar}
                height={bh}
                rx={3}
                className={i === series.length - 1 ? 'fill-brand-700' : 'fill-brand-100'}
              />
              {i % 2 === series.length % 2 && (
                <text x={x + bar / 2} y={h + 16} textAnchor="middle" className="fill-neutral-500 text-[10px]">
                  {s.day.slice(8)}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </figure>
  )
}
