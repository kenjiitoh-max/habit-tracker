import { describe, expect, it } from 'vitest'
import { bodyTrendDate, getBodyTrend } from './bodyTrends'

const items = [
  { date: '2026-01-18', weightKg: 62 },
  { date: '2026-01-02', bodyFatPercent: 18 },
  { date: '2026-01-04', weightKg: 68, bodyFatPercent: 20 },
  { date: '2025-12-29', weightKg: 72 },
]

describe('body trends', () => {
  it('uses calendar days across year boundaries, with separate observations per metric', () => {
    const weight = getBodyTrend(items, 'weightKg', '2026-01-18')
    const fat = getBodyTrend(items, 'bodyFatPercent', '2026-01-18')
    const on = (series: typeof weight, date: string) => series.find(({ day }) => bodyTrendDate(day) === date)

    expect(on(weight, '2026-01-02')).toMatchObject({ measured: null, average: 72 })
    expect(on(weight, '2026-01-04')).toMatchObject({ measured: 68, average: 70 })
    expect(on(weight, '2026-01-05')).toMatchObject({ measured: null, average: 68 })
    expect(on(fat, '2026-01-04')).toMatchObject({ measured: 20, average: 19 })
    expect(on(fat, '2026-01-09')).toMatchObject({ measured: null, average: 20 })
  })

  it('omits days without observations in the window and stops at the supplied date', () => {
    const weight = getBodyTrend(items, 'weightKg', '2026-01-18')
    expect(weight.slice(-3).map(({ day }) => bodyTrendDate(day))).toEqual(['2026-01-09', '2026-01-10', '2026-01-18'])
    expect(weight.at(-1)).toMatchObject({ measured: 62, average: 62 })
    expect(getBodyTrend(items, 'bodyFatPercent', '2026-01-01')).toEqual([])
    expect(getBodyTrend(items.filter((item) => item.weightKg === undefined), 'weightKg', '2026-01-18')).toEqual([])
  })
})
