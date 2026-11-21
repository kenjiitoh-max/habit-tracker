import { describe, expect, it } from 'vitest'
import { getPeriodStats } from './stats'
import { today } from './date'
import type { Habit, HabitLog } from './types'

const habit = (id: string, createdAt: string): Habit => ({ id, name: id, createdAt, order: 0 })
const done = (habitId: string, date: string): HabitLog => ({ habitId, date, done: true })

describe('period statistics', () => {
  it('uses inclusive JST creation dates and only eligible habits in daily denominators', () => {
    const habits = [habit('a', '2025-12-01T00:00:00Z'), habit('b', '2026-01-01T16:00:00Z')]
    const logs = [done('a', '2026-01-01'), done('a', '2026-01-02'), done('b', '2026-01-01'), done('b', '2026-01-02')]
    const result = getPeriodStats(habits, logs, today(new Date('2026-01-01T16:00:00Z')), 7)
    expect(result.daily[0].date).toBe('2025-12-27')
    expect(result.daily[5]).toEqual({ date: '2026-01-01', done: 1, total: 1, percent: 100 })
    expect(result.daily[6]).toEqual({ date: '2026-01-02', done: 2, total: 2, percent: 100 })
    expect(result.perHabit[0].percent).toBeCloseTo(200 / 7)
    expect(result.perHabit[1]).toEqual({ habitId: 'b', done: 1, total: 1, percent: 100 })
    expect(result.summary).toEqual({ done: 3, total: 8, percent: 37.5 })
  })
  it('returns null, not NaN or Infinity, when no habits existed', () => {
    const empty = getPeriodStats([], [], '2026-01-02', 30)
    expect(empty.daily).toHaveLength(30)
    expect(empty.daily[0].date).toBe('2025-12-04')
    expect(empty.daily.every((day) => day.percent === null && day.total === 0)).toBe(true)
    expect(empty.summary.percent).toBeNull()
    expect(empty.perHabit).toEqual([])
    const future = getPeriodStats([habit('a', '2026-01-03T00:00:00Z')], [], '2026-01-02', 7)
    expect(future.perHabit[0]).toEqual({ habitId: 'a', done: 0, total: 0, percent: null })
  })
  it('ignores duplicates, undone, unknown and out-of-period logs', () => {
    const logs = [done('a', '2026-01-02'), done('a', '2026-01-02'), done('a', '2026-01-03'), done('a', '2025-12-01'), done('missing', '2026-01-02'), { ...done('a', '2026-01-01'), done: false }]
    const stats = getPeriodStats([habit('a', '2025-01-01T00:00:00Z')], logs, '2026-01-02', 30)
    expect(stats.perHabit[0].done).toBe(1)
    expect(stats.perHabit[0].total).toBe(30)
    expect(stats.perHabit[0].percent).toBeCloseTo(100 / 30)
    expect(stats.daily[28].percent).toBe(0)
  })
  it('rejects invalid date inputs', () => {
    expect(() => getPeriodStats([], [], '', 7)).toThrow()
    expect(() => getPeriodStats([habit('a', 'broken')], [], '2026-01-02', 7)).toThrow()
  })
})
