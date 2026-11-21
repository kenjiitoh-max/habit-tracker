import { expect, it } from 'vitest'
import { getWorkoutDays } from './workoutStats'
import type { WorkoutSet } from './workoutSets'

it('aggregates selected sets by date and distinguishes gaps, unweighted sets and a recorded zero', () => {
  const set = (id: string, date: string, reps: number, weightKg?: number, exerciseId = 'bench'): WorkoutSet =>
    ({ id, date, reps, weightKg, exerciseId, createdAt: `${date}T12:00:00Z` })
  const sets = [
    set('a', '2026-08-06', 3, 0),
    set('b', '2026-08-01', 10, 60),
    set('c', '2026-08-01', 6, 62.5),
    set('d', '2026-08-01', 6),
    set('e', '2026-08-04', 8),
    set('f', '2026-08-02', 10, 100, 'squat'),
  ]

  expect(getWorkoutDays(sets, 'bench')).toEqual([
    { date: '2026-08-01', maxWeight: 62.5, volume: 975 },
    { date: '2026-08-04', maxWeight: null, volume: null },
    { date: '2026-08-06', maxWeight: 0, volume: 0 },
  ])
  expect(getWorkoutDays(sets, 'other')).toEqual([])
})
