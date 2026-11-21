import { describe, expect, it } from 'vitest'
import { toDateKey } from './date'
import { getLegacyStudyLogs, getStudyStats } from './studyStats'

const date = toDateKey(new Date('2025-12-31T15:30:00Z'))
const days = {
  '2025-10-10': { spiful: 5 },
  '2025-12-28': { shadoten: 100 },
  '2025-12-29': { shadoten: 15 },
  '2025-12-31': { spiful: 12 },
  '2026-01-01': { shadoten: 0, spiful: 7.5 },
  '2026-01-02': { shadoten: 99 },
}

describe('English study aggregation', () => {
  it('uses Tokyo dates and calendar weeks and months across the year boundary', () => {
    const daily = getStudyStats(days, [], date, 'day', 'total')
    const weekly = getStudyStats(days, [], date, 'week', 'total')
    const monthly = getStudyStats(days, [], date, 'month', 'total')
    expect(daily.current).toMatchObject({ start: '2026-01-01', end: '2026-01-01', minutes: 7.5 })
    expect(weekly.current).toMatchObject({ start: '2025-12-29', end: '2026-01-01', minutes: 34.5 })
    expect(weekly.trend.at(-2)).toMatchObject({ start: '2025-12-22', end: '2025-12-28', minutes: 100 })
    expect(monthly.trend.at(-2)).toMatchObject({ start: '2025-12-01', end: '2025-12-31', minutes: 127 })
    expect(monthly.current).toMatchObject({ start: '2026-01-01', end: '2026-01-01', minutes: 7.5 })
    expect(monthly.lifetime.minutes).toBe(139.5)
  })

  it('keeps explicit zero, missing minutes and legacy records separate', () => {
    const legacy = [
      { habitId: 'old', date: '2025-12-28', done: true, value: 0 },
      { habitId: 'old', date: '2025-12-30', done: true },
      { habitId: 'old', date, done: true, value: 59 },
    ]
    const shadoten = getStudyStats(days, legacy, date, 'day', 'shadoten')
    const spiful = getStudyStats(days, legacy, date, 'day', 'spiful')
    const total = getStudyStats(days, legacy, date, 'day', 'total')
    expect(shadoten.current).toMatchObject({ minutes: 0, legacyMinutes: null, untimed: 0 })
    expect(shadoten.trend.at(-2)?.minutes).toBeNull()
    expect(shadoten.lifetime.minutes).toBe(115)
    expect(spiful.lifetime.minutes).toBe(24.5)
    expect(total.current).toMatchObject({ minutes: 7.5, legacyMinutes: 59, untimed: 0 })
    expect(total.trend.find(({ start }) => start === '2025-12-28')?.legacyMinutes).toBe(0)
    expect(total.trend.find(({ start }) => start === '2025-12-30')).toMatchObject({
      minutes: null, legacyMinutes: null, untimed: 1,
    })
    expect(total.lifetime).toMatchObject({ minutes: 139.5, legacyMinutes: 59, untimed: 1 })
  })

  it('selects completed logs for the original minute-based English habit only', () => {
    const habit = { id: 'old', name: '英語トレーニング', unit: '分', createdAt: '2020-01-01T00:00:00Z', order: 0 }
    const log = { habitId: 'old', date, done: true, value: 10 }
    expect(getLegacyStudyLogs([habit, { ...habit, id: 'other-unit', unit: '回' }, { ...habit, id: 'reading', name: '読書' }], [
      log,
      { ...log, done: false },
      { ...log, habitId: 'reading' },
      { ...log, habitId: 'other-unit' },
    ])).toEqual([log])
  })
})
