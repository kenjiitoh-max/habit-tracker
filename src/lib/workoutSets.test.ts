import { describe, expect, it } from 'vitest'
import { createWorkoutSetRepository, formatSet, groupByExercise, normalizeSet, WORKOUT_SETS_STORAGE_KEY } from './workoutSets'

describe('workout sets', () => {
  it('saves, updates and deletes sets per day without touching the habit data', () => {
    const legacy = JSON.stringify({ habits: [{ id: 'h', name: '筋トレ', unit: '回', createdAt: 'x', order: 0 }], logs: [{ habitId: 'h', date: '2026-01-01', done: true, value: 30 }] })
    localStorage.setItem('habit-tracker:v1', legacy)
    const repo = createWorkoutSetRepository()
    const first = repo.addSet('2026-01-02', { exerciseId: 'preset-chest-bench-press', weightKg: 60, reps: 10 }, false)
    repo.addSet('2026-01-02', { exerciseId: 'preset-back-pullup', weightKg: 20, reps: 8 }, true)
    repo.addSet('2026-01-01', { exerciseId: 'preset-legs-squat', weightKg: 80, reps: 5 }, false)
    expect(repo.listSets('2026-01-02').map(({ exerciseId, weightKg, reps }) => ({ exerciseId, weightKg, reps }))).toEqual([
      { exerciseId: 'preset-chest-bench-press', weightKg: 60, reps: 10 },
      { exerciseId: 'preset-back-pullup', weightKg: undefined, reps: 8 },
    ])
    repo.updateSet(first.id, { exerciseId: first.exerciseId, weightKg: 62.5, reps: 8 }, false)
    expect(createWorkoutSetRepository().listSets('2026-01-02')[0]).toMatchObject({ id: first.id, date: '2026-01-02', weightKg: 62.5, reps: 8 })
    repo.deleteSet(first.id)
    expect(repo.listSets('2026-01-02')).toHaveLength(1)
    expect(repo.listSets('2026-01-01')).toHaveLength(1)
    expect(localStorage.getItem('habit-tracker:v1')).toBe(legacy)
    expect(JSON.parse(localStorage.getItem(WORKOUT_SETS_STORAGE_KEY)!).sets).toHaveLength(2)
  })

  it('validates weight and reps', () => {
    expect(() => normalizeSet({ exerciseId: 'a', reps: 0 }, true)).toThrow()
    expect(() => normalizeSet({ exerciseId: 'a', reps: 1.5 }, true)).toThrow()
    expect(() => normalizeSet({ exerciseId: 'a', reps: 5 }, false)).toThrow()
    expect(() => normalizeSet({ exerciseId: 'a', reps: 5, weightKg: -1 }, false)).toThrow()
    expect(normalizeSet({ exerciseId: 'a', reps: 5, weightKg: 0 }, false)).toEqual({ exerciseId: 'a', reps: 5, weightKg: 0 })
  })

  it('does not overwrite unreadable stored sets', () => {
    localStorage.setItem(WORKOUT_SETS_STORAGE_KEY, '{"broken":true}')
    const repo = createWorkoutSetRepository()
    expect(() => repo.listSets('2026-01-01')).toThrow()
    expect(() => repo.addSet('2026-01-01', { exerciseId: 'a', reps: 5 }, true)).toThrow()
    expect(localStorage.getItem(WORKOUT_SETS_STORAGE_KEY)).toBe('{"broken":true}')
  })

  it('keeps demo sets in memory only', () => {
    const repo = createWorkoutSetRepository('2026-01-02')
    expect(repo.listSets('2026-01-01')).toHaveLength(5)
    repo.addSet('2026-01-02', { exerciseId: 'preset-legs-squat', weightKg: 80, reps: 8 }, false)
    expect(repo.listSets('2026-01-02')).toHaveLength(2)
    expect(localStorage.getItem(WORKOUT_SETS_STORAGE_KEY)).toBeNull()
  })

  it('formats and groups sets', () => {
    expect(formatSet({ weightKg: 60, reps: 10 })).toBe('60 kg × 10回')
    expect(formatSet({ reps: 12 })).toBe('12回')
    const sets = [
      { id: '1', date: 'd', exerciseId: 'a', reps: 1, createdAt: '1' },
      { id: '2', date: 'd', exerciseId: 'b', reps: 2, createdAt: '2' },
      { id: '3', date: 'd', exerciseId: 'a', reps: 3, createdAt: '3' },
    ]
    expect(groupByExercise(sets).map(([id, items]) => [id, items.map((item) => item.id)])).toEqual([['a', ['1', '3']], ['b', ['2']]])
  })
})
