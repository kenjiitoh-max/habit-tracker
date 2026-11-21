import { describe, expect, it } from 'vitest'
import { countPersonalBestUpdates, getActivityHistory, longestStreak } from './activity'
import { today } from './date'
import { getHomeSummary } from './homeSummary'
import type { WorkoutSet } from './workoutSets'

describe('activity history', () => {
  it('keeps yesterday’s streak until the next JST midnight', () => {
    const days = { '2026-06-01': { shadoten: 10 } }
    const before = getHomeSummary([], [], days, [], today(new Date('2026-06-02T14:59:59Z')))
    expect(before).toMatchObject({ streak: 1, broken: false })
    const after = getHomeSummary([], [], days, [], today(new Date('2026-06-02T15:00:00Z')))
    expect(after).toMatchObject({ streak: 0, broken: true })
  })
  it('preserves the longest after multiple missing days, choosing recent ties', () => {
    const dates = ['2026-05-01', '2026-05-02', '2026-06-01', '2026-06-02']
    expect(getActivityHistory(dates, '2026-06-08')).toEqual({
      broken: true, totalDays: 4, longest: { length: 2, start: '2026-06-01', end: '2026-06-02' },
    })
    expect(getHomeSummary([], [], { '2026-06-02': { spiful: 10 } }, [], '2026-06-08').streak).toBe(0)
  })
  it('counts multiple activity types on one day once', () => {
    const habit = { id: 'h', name: '読書', order: 0, createdAt: '2026-06-01' }
    const set = { id: 's', exerciseId: 'e', date: '2026-06-01', createdAt: '2026-06-01', reps: 10 }
    expect(getHomeSummary([habit], [{ habitId: 'h', date: set.date, done: true }], {
      [set.date]: { shadoten: 0, spiful: 10 },
    }, [set, { ...set, id: 's2' }], '2026-06-04')).toMatchObject({ totalDays: 1, broken: true, streak: 0 })
  })
  it('does not break unused, active-today or active-yesterday histories', () => {
    for (const dates of [[], ['2026-06-03'], ['2026-06-02'], ['2026-06-01', '2026-06-03'], ['2026-06-04']]) {
      expect(getActivityHistory(dates, '2026-06-03').broken).toBe(false)
    }
    expect(longestStreak([])).toBeNull()
    expect(getActivityHistory(['2026-06-04'], '2026-06-03').totalDays).toBe(0)
  })
})

describe('personal-best update replay', () => {
  const exercises = [
    { id: 'e', name: 'ベンチ', bodyPart: 'chest' as const, bodyweight: false, createdAt: '' },
    { id: 'b', name: '懸垂', bodyPart: 'back' as const, bodyweight: true, createdAt: '' },
  ]
  const set = (id: string, date: string, reps: number, weightKg?: number, exerciseId = 'e'): WorkoutSet => ({
    id, date, reps, weightKg, exerciseId, createdAt: `${date}T${id}:00:00Z`,
  })
  it('counts improved metrics, not firsts, sorted by date then creation time per exercise', () => {
    const sets = [set('10', '2026-06-01', 10, 20), set('11', '2026-06-01', 12, 25), set('10', '2026-06-02', 12, 25)]
    // Second set improves weight, reps and daily volume. The next day ties weight/reps and has less volume.
    expect(countPersonalBestUpdates(sets.reverse(), exercises)).toBe(3)
    expect(countPersonalBestUpdates([set('10', '2026-06-01', 5, undefined, 'b'), set('10', '2026-06-02', 6, undefined, 'b')], exercises)).toBe(1)
  })
  it('handles empty, unknown exercises and unknown weights without inventing updates', () => {
    expect(countPersonalBestUpdates([], exercises)).toBe(0)
    expect(countPersonalBestUpdates([set('10', '2026-06-01', 10, 20, 'unknown')], exercises)).toBe(0)
    expect(countPersonalBestUpdates([set('10', '2026-06-01', 10), set('10', '2026-06-02', 10, 20)], exercises)).toBe(0)
  })
})
