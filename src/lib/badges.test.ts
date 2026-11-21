import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BADGES_KEY, badges, createBadgeRepository, earnedBadges, getBadgeMetrics } from './badges'

beforeEach(() => localStorage.clear())
describe('achievement badges', () => {
  it('awards every tier at its boundary, without duplicates or unknown ids', () => {
    expect(earnedBadges({ days: 0, bests: 0, minutes: 0 })).toEqual([])
    expect(earnedBadges({ days: 6, bests: 0, minutes: 599 })).toEqual([])
    expect(earnedBadges({ days: 7, bests: 1, minutes: 600 })).toEqual(['days-7', 'bests-1', 'english-10'])
    expect(earnedBadges({ days: 30, bests: 5, minutes: 3000 })).toHaveLength(6)
    const all = earnedBadges({ days: 100, bests: 20, minutes: 6000 }, ['days-7', 'days-7', 'unknown'])
    expect(all).toEqual(badges.map((badge) => badge.id))
  })
  it('counts unique recorded dates, improved bests, and both English services, excluding future data', () => {
    const metrics = getBadgeMetrics([], [], {
      '2026-06-01': { shadoten: 300, spiful: 300 },
      '2026-06-02': { shadoten: 0 },
      '2026-07-01': { spiful: 100 },
    }, [
      { id: '1', exerciseId: 'e', date: '2026-06-01', createdAt: '1', reps: 5 },
      { id: '2', exerciseId: 'e', date: '2026-06-02', createdAt: '2', reps: 6 },
    ], [{ id: 'e', name: '懸垂', bodyPart: 'back', bodyweight: true, createdAt: '1' }], '2026-06-03')
    expect(metrics).toEqual({ days: 2, bests: 1, minutes: 600 })
  })
  it('persists once earned across reloads, streak breaks and record corrections without touching existing records', () => {
    localStorage.setItem('habit-tracker:v1', JSON.stringify({ habits: [], logs: [] }))
    const original = localStorage.getItem('habit-tracker:v1')
    createBadgeRepository().award({ days: 7, bests: 1, minutes: 600 })
    const afterBreak = getBadgeMetrics([], [], {}, [], [], '2026-06-30')
    const repo = createBadgeRepository()
    repo.award(afterBreak)
    repo.award(afterBreak)
    expect(repo.read()).toEqual(['days-7', 'bests-1', 'english-10'])
    expect(localStorage.getItem('habit-tracker:v1')).toBe(original)
  })
  it('keeps demo awards in memory without accessing storage', () => {
    const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('private') })
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('private') })
    try {
      const repo = createBadgeRepository(true)
      expect(repo.award({ days: 7, bests: 0, minutes: 0 })).toEqual(['days-7'])
      expect(repo.read()).toEqual(['days-7'])
      expect(read).not.toHaveBeenCalled()
      expect(write).not.toHaveBeenCalled()
    } finally { vi.restoreAllMocks() }
  })
  it('surfaces invalid data and storage failures without overwriting data', () => {
    localStorage.setItem(BADGES_KEY, '{')
    expect(() => createBadgeRepository().award({ days: 100, bests: 20, minutes: 6000 })).toThrow()
    expect(localStorage.getItem(BADGES_KEY)).toBe('{')
    localStorage.clear()
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    expect(() => createBadgeRepository().award({ days: 7, bests: 0, minutes: 0 })).toThrow('quota')
    write.mockRestore()
  })
})
