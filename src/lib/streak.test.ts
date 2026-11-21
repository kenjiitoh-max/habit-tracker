import { describe, expect, it } from 'vitest'
import { today } from './date'
import { getStreak } from './streak'
import type { HabitLog } from './types'

const done = (date: string, habitId = 'a'): HabitLog => ({ habitId, date, done: true })

describe('getStreak', () => {
  it('counts consecutive days through today, ignoring order, duplicates and future logs', () => {
    const logs = [done('2026-01-01'), done('2026-01-03'), done('2025-12-31'), done('2026-01-02'), done('2026-01-01')]
    expect(getStreak('a', logs, '2026-01-02')).toBe(3)
  })
  it('keeps yesterday’s streak when today is not done', () => {
    const logs = [done('2026-01-01'), done('2025-12-31'), { ...done('2026-01-02'), done: false }]
    expect(getStreak('a', logs, '2026-01-02')).toBe(2)
  })
  it('stops at gaps and does not count other habits or undone days', () => {
    expect(getStreak('a', [done('2026-01-02'), done('2025-12-31')], '2026-01-02')).toBe(1)
    expect(getStreak('a', [done('2025-12-31'), done('2026-01-01', 'b')], '2026-01-02')).toBe(0)
    expect(getStreak('a', [], '2026-01-02')).toBe(0)
  })
  it('uses the JST day on both sides of midnight', () => {
    const logs = [done('2025-12-31'), done('2026-01-01')]
    expect(getStreak('a', logs, today(new Date('2026-01-01T14:59:59Z')))).toBe(2)
    expect(getStreak('a', logs, today(new Date('2026-01-01T15:00:00Z')))).toBe(2)
    expect(getStreak('a', logs, today(new Date('2026-01-02T15:00:00Z')))).toBe(0)
  })
  it('rejects invalid reference dates', () => {
    expect(() => getStreak('a', [], '')).toThrow()
    expect(() => getStreak('a', [], '2026-02-30')).toThrow()
  })
})
