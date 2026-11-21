import { describe, expect, it } from 'vitest'
import { getDailyWrapUp } from './dailyWrapUp'
import { createPresets } from './exercises'
import { today } from './date'
import { createXpRepository } from './xp'
import type { WorkoutSet } from './workoutSets'

const date = '2026-06-03'
const exerciseId = 'preset-chest-bench-press'
const set = (id: string, day: string, weightKg = 20): WorkoutSet => ({ id, date: day, exerciseId, weightKg, reps: 10, createdAt: `${day}T12:00:00Z` })
const emptyXp = { totalXp: 0, awarded: {} }
const summarize = (sets: WorkoutSet[], day = date) => getDailyWrapUp([], [], {}, sets, createPresets(), emptyXp, day)

describe('daily wrap-up', () => {
  it('sums the awarded XP including comeback, without other days', () => {
    const xp = createXpRepository(true)
    xp.awardStudy(date, 'shadoten', 10)
    xp.awardSet('today')
    xp.awardComeback(date)
    xp.awardStudy('2026-06-01', 'spiful', 10)
    const result = getDailyWrapUp([], [], { [date]: { shadoten: 10 } }, [set('today', date)], createPresets(), xp.read(), date)
    expect(result.earnedXp).toBe(50)
    expect(result.streak).toBe(1)
  })
  it('lists exercise and each PR kind, collapsing repeated improvements', () => {
    const result = summarize([set('old', '2026-06-01', 10), set('a', date), set('b', date, 30)])
    expect(result.bests.map(({ exercise, best }) => [exercise, best.metric, best.value])).toEqual([
      ['ベンチプレス', 'weight', 30], ['ベンチプレス', 'volume', 500],
    ])
  })
  it('has no PR when today does not beat history', () => {
    const result = summarize([set('old', '2026-06-01', 40), set('a', date)])
    expect(result.recordedToday).toBe(true)
    expect(result.bests).toEqual([])
  })
  it('distinguishes an empty day', () => {
    expect(summarize([])).toEqual({ earnedXp: 0, streak: 0, recordedToday: false, bests: [] })
  })
  it('switches at JST midnight rather than UTC midnight', () => {
    const sets = [set('a', date)]
    const before = today(new Date('2026-06-03T14:59:59Z'))
    const after = today(new Date('2026-06-03T15:00:00Z'))
    expect(summarize(sets, before).recordedToday).toBe(true)
    expect(summarize(sets, after).recordedToday).toBe(false)
    expect(summarize(sets, after).bests).toEqual([])
  })
})
