import { describe, expect, it } from 'vitest'
import { createStreakMilestoneRepository as createRepository, nextMilestone, reachedMilestone, STREAK_MILESTONES_KEY, streakStart } from './streakMilestones'

function createStreakMilestoneRepository(demo = false) {
  const repository = createRepository(demo)
  return {
    claim(streak: number, start: string) {
      const pending = repository.pending(streak, start)
      if (pending) repository.markCelebrated(pending.key)
      return pending?.milestone ?? null
    },
  }
}

describe('streak milestones', () => {
  it('finds the reached and next milestones', () => {
    expect([0, 6, 7, 29, 30, 99, 100, 150].map(reachedMilestone)).toEqual([null, null, 7, 7, 30, 30, 100, 100])
    expect([0, 6, 7, 29, 30, 99, 100].map(nextMilestone)).toEqual([7, 7, 30, 30, 100, 100, null])
    expect(streakStart(7, '2026-06-07')).toBe('2026-06-01')
  })

  it('celebrates each milestone of a run once, even after reloading', () => {
    expect(createStreakMilestoneRepository().claim(6, '2026-06-01')).toBeNull()
    expect(createStreakMilestoneRepository().claim(7, '2026-06-01')).toBe(7)
    expect(createStreakMilestoneRepository().claim(7, '2026-06-01')).toBeNull()
    expect(createStreakMilestoneRepository().claim(8, '2026-06-01')).toBeNull()
    expect(createStreakMilestoneRepository().claim(30, '2026-06-01')).toBe(30)
    expect(createStreakMilestoneRepository().claim(7, '2026-08-01')).toBe(7)
    expect(JSON.parse(localStorage.getItem(STREAK_MILESTONES_KEY)!)).toEqual({ celebrated: ['2026-06-01:7', '2026-06-01:30', '2026-08-01:7'] })
  })

  it('leaves existing records untouched and tolerates broken milestone data', () => {
    const existing = { 'habit-tracker:v1': '{"habits":[],"logs":[]}', 'habit-tracker:xp:v1': '{"totalXp":10,"awarded":{}}' }
    for (const [key, value] of Object.entries(existing)) localStorage.setItem(key, value)
    localStorage.setItem(STREAK_MILESTONES_KEY, '{broken')
    expect(createStreakMilestoneRepository().claim(7, '2026-06-01')).toBe(7)
    for (const [key, value] of Object.entries(existing)) expect(localStorage.getItem(key)).toBe(value)
  })

  it('keeps demo celebrations in memory only', () => {
    const demo = createStreakMilestoneRepository(true)
    expect(demo.claim(7, '2026-06-01')).toBe(7)
    expect(demo.claim(7, '2026-06-01')).toBeNull()
    expect(localStorage.getItem(STREAK_MILESTONES_KEY)).toBeNull()
  })
})
