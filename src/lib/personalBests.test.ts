import { describe, expect, it } from 'vitest'
import { detectPersonalBests } from './personalBests'
import type { WorkoutSet } from './workoutSets'

function set(id: string, date: string, reps: number, weightKg?: number): WorkoutSet {
  return { id, date, reps, weightKg, exerciseId: 'bench', createdAt: date }
}

describe('workout personal bests', () => {
  it('distinguishes first records and compares the three metrics independently', () => {
    const first = set('a', '2026-01-01', 10, 60)
    expect(detectPersonalBests([], first, false)).toEqual([
      { metric: 'weight', value: 60, kind: 'first' },
      { metric: 'reps', value: 10, kind: 'first' },
      { metric: 'volume', value: 600, kind: 'first' },
    ])
    expect(detectPersonalBests([first], set('b', '2026-01-02', 8, 65), false)).toEqual([
      { metric: 'weight', value: 65, kind: 'improved' },
    ])
  })

  it('sums sets per day, not across days, and compares the edited session against its previous total', () => {
    const old = set('a', '2026-01-01', 10, 60)
    const otherDay = set('b', '2026-01-02', 10, 60)
    const today = set('c', '2026-01-03', 5, 60)
    const next = set('d', today.date, 6, 60)
    expect(detectPersonalBests([old, otherDay, today], next, false)).toEqual([
      { metric: 'volume', value: 660, kind: 'improved' },
    ])
    const history = [old, otherDay, today, next]
    expect(detectPersonalBests(history, next, false)).toEqual([])
    expect(detectPersonalBests(history, { ...next, reps: 7 }, false)).toEqual([
      { metric: 'volume', value: 720, kind: 'improved' },
    ])
  })

  it('only compares reps for bodyweight exercises, even when older sets have weights', () => {
    const history = [set('a', '2026-01-01', 10, 60)]
    expect(detectPersonalBests(history, set('b', '2026-01-02', 10), true)).toEqual([])
    expect(detectPersonalBests(history, set('b', '2026-01-02', 11, 70), true)).toEqual([
      { metric: 'reps', value: 11, kind: 'improved' },
    ])
  })

  it('ignores unknown weights without treating them as zero or excluding known sets', () => {
    const unknown = set('a', '2026-01-01', 10)
    expect(detectPersonalBests([], unknown, false)).toEqual([{ metric: 'reps', value: 10, kind: 'first' }])
    const zero = set('b', unknown.date, 10, 0)
    expect(detectPersonalBests([unknown], zero, false)).toEqual([
      { metric: 'weight', value: 0, kind: 'first' },
      { metric: 'volume', value: 0, kind: 'first' },
    ])
    expect(detectPersonalBests([unknown, zero], set('c', unknown.date, 11), false)).toEqual([
      { metric: 'reps', value: 11, kind: 'improved' },
    ])
  })

  it('does not treat rounding noise in decimal session totals as a record', () => {
    const old = set('a', '2026-01-01', 1, 0.3)
    const today = set('b', '2026-01-02', 1, 0.1)
    expect(detectPersonalBests([old, today], set('c', today.date, 1, 0.2), false)).toEqual([])
    const many = Array.from({ length: 100 }, (_, index) => set(String(index), old.date, 1, 0.1))
    expect(detectPersonalBests(many, set('d', today.date, 1, 10), false)).toEqual([
      { metric: 'weight', value: 10, kind: 'improved' },
    ])
  })
})
