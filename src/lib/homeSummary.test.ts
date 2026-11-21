import { describe, expect, it } from 'vitest'
import { getHomeSummary } from './homeSummary'

const date = '2026-06-03'
const habit = { id: 'read', name: '読書', order: 0, createdAt: date }
const set = { id: 'set', date, exerciseId: 'bench', reps: 10, weightKg: 20, createdAt: date }

describe('getHomeSummary', () => {
  const legacyHabits = [
    { ...habit, id: 'workout', name: '筋トレ', unit: '回' },
    { ...habit, id: 'english', name: '英語トレーニング', unit: '分' },
    { ...habit, id: 'demo-workout', name: '筋トレ' },
  ]
  it('excludes legacy generic habits without hiding other custom habits', () => {
    const customEnglish = { ...habit, id: 'custom-english', name: '英語トレーニング', unit: 'ページ' }
    const summary = getHomeSummary([...legacyHabits, habit, customEnglish], [], {}, [], date)
    expect(summary.unrecorded.map((item) => item.target)).toEqual([
      'workout-exercise', 'study-shadoten', 'study-spiful', 'habit-read', 'habit-custom-english',
    ])
    expect(summary.allDone).toBe(false)
  })
  it('does not require legacy check-ins for completion', () => {
    const summary = getHomeSummary(legacyHabits, [], { [date]: { shadoten: 10, spiful: 5 } }, [set], date)
    expect(summary.unrecorded).toEqual([])
    expect(summary.allDone).toBe(true)
  })
  it('keeps legacy done logs in the streak without completing dedicated items', () => {
    const summary = getHomeSummary(legacyHabits, [
      { habitId: 'english', date: '2026-06-02', done: true },
      { habitId: 'workout', date, done: true },
      { habitId: 'demo-workout', date: '2026-06-01', done: false },
    ], {}, [], date)
    expect(summary.streak).toBe(2)
    expect(summary.unrecorded.map((item) => item.label)).toEqual(['筋トレ', 'シャドテン', 'スピフル'])
    expect(summary.allDone).toBe(false)
  })
  it('lists workout, both study services and incomplete custom habits, never body measurements', () => {
    const summary = getHomeSummary([habit], [], {}, [], date)
    expect(summary.unrecorded.map((item) => item.label)).toEqual(['筋トレ', 'シャドテン', 'スピフル', '読書'])
    expect(summary.allDone).toBe(false)
    expect(summary.streak).toBe(0)
  })
  it('counts saved zero minutes as recorded and requires today’s records', () => {
    const summary = getHomeSummary([habit], [{ habitId: habit.id, date, done: false }], {
      [date]: { shadoten: 0 }, '2026-06-02': { spiful: 20 },
    }, [{ ...set, date: '2026-06-02' }], date)
    expect(summary.unrecorded.map((item) => item.label)).toEqual(['筋トレ', 'スピフル', '読書'])
    expect(summary.streak).toBe(2)
  })
  it('shows all done only when every item is recorded, and reverses on deletion', () => {
    const days = { [date]: { shadoten: 10, spiful: 5 } }
    const logs = [{ habitId: habit.id, date, done: true }]
    expect(getHomeSummary([habit], logs, days, [set], date).allDone).toBe(true)
    expect(getHomeSummary([], [], days, [set], date).allDone).toBe(true)
    expect(getHomeSummary([habit], logs, days, [], date).allDone).toBe(false)
  })
  it('does not treat invalid minutes or future records as today’s completion or streak', () => {
    const summary = getHomeSummary([], [], { [date]: { shadoten: NaN, spiful: -1 } }, [{ ...set, date: '2026-06-04' }], date)
    expect(summary.unrecorded).toHaveLength(3)
    expect(summary.streak).toBe(0)
  })
})
