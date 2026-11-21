import type { BodyMeasurement } from './bodyStorage'

export type BodyMetric = 'weightKg' | 'bodyFatPercent'

const DAY_MS = 86_400_000
const WINDOW_DAYS = 7
const toDay = (date: string) => Date.parse(`${date}T00:00:00Z`) / DAY_MS
export const bodyTrendDate = (day: number) => new Date(day * DAY_MS).toISOString().slice(0, 10)

export function getBodyTrend(items: readonly BodyMeasurement[], metric: BodyMetric, date: string) {
  const end = toDay(date)
  const windows = new Map<number, { measured: number | null; sum: number; count: number }>()
  for (const item of items) {
    const measured = item[metric]
    if (measured === undefined) continue
    const observed = toDay(item.date)
    // An observation contributes to its own calendar day and the next six.
    for (let day = observed; day < observed + WINDOW_DAYS && day <= end; day++) {
      const window = windows.get(day) ?? { measured: null, sum: 0, count: 0 }
      if (day === observed) window.measured = measured
      window.sum += measured
      window.count++
      windows.set(day, window)
    }
  }
  return [...windows]
    .sort(([a], [b]) => a - b)
    .map(([day, { measured, sum, count }]) => ({ day, measured, average: sum / count }))
}
