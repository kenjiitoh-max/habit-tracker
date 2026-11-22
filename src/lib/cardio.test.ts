import { describe, expect, it, vi } from 'vitest'
import { CARDIO_KEY, createCardioRepository, normalizeCardio } from './cardio'
import { createXpRepository, XP_STORAGE_KEY } from './xp'
import { getHomeSummary } from './homeSummary'
import { getBadgeMetrics } from './badges'
import { getDailyWrapUp } from './dailyWrapUp'

const date = '2026-06-04'
const input = { type: 'ランニング' as const, minutes: 20, distanceKm: 3 }
describe('cardio repository', () => {
  it.each([null, '{', '{}', '{"sessions":[null]}', '{"sessions":[{"id":"bad"}]}'])('reads missing/corrupt data as empty without writing: %s', (raw) => {
    if (raw !== null) localStorage.setItem(CARDIO_KEY, raw)
    expect(createCardioRepository().listSessions()).toEqual([])
    expect(localStorage.getItem(CARDIO_KEY)).toBe(raw)
  })
  it('persists CRUD without touching legacy habits or workouts; awards XP once and never deducts', () => {
    const legacy = ' {"habits":[],"logs":[],"exercises":[]} '
    const workouts = ' {"sets":[]} '
    localStorage.setItem('habit-tracker:v1', legacy)
    localStorage.setItem('habit-tracker:workout-sets:v1', workouts)
    const xp = createXpRepository()
    const repo = createCardioRepository(undefined, xp)
    const saved = repo.addSession(date, input, 'one')
    repo.addSession(date, input, 'one')
    expect(createCardioRepository().listSessions()).toEqual([saved])
    repo.updateSession('one', { type: '水泳', minutes: 30 })
    expect(repo.listSessions()[0]).toEqual({ ...saved, type: '水泳', minutes: 30, distanceKm: undefined })
    expect(xp.read()).toEqual({ totalXp: 10, awarded: { 'cardio:one': 10 } })
    repo.deleteSession('one')
    expect(repo.listSessions()).toEqual([])
    expect(xp.read().totalXp).toBe(10)
    expect(localStorage.getItem('habit-tracker:v1')).toBe(legacy)
    expect(localStorage.getItem('habit-tracker:workout-sets:v1')).toBe(workouts)
    expect(() => repo.updateSession('missing', input)).toThrow('記録が見つかりません')
  })
  it('validates minutes, distance, type and date', () => {
    for (const minutes of [0, -1, 1.5, NaN, Infinity]) expect(() => normalizeCardio({ ...input, minutes })).toThrow('時間')
    for (const distanceKm of [0, -1, NaN, Infinity]) expect(() => normalizeCardio({ ...input, distanceKm })).toThrow('距離')
    expect(() => normalizeCardio({ ...input, type: 'invalid' as typeof input.type })).toThrow('種類')
    expect(() => createCardioRepository().addSession('2026-02-30', input)).toThrow()
    expect(normalizeCardio({ type: 'その他', minutes: 1 })).toEqual({ type: 'その他', minutes: 1 })
  })
  it('retries after an XP write failure without duplicating a session', () => {
    const original = Storage.prototype.setItem
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key, value) {
      if (key === XP_STORAGE_KEY) throw new Error('quota')
      original.call(this, key, value)
    })
    const repo = createCardioRepository()
    expect(() => repo.addSession(date, input, 'retry')).toThrow('quota')
    spy.mockRestore()
    repo.addSession(date, input, 'retry')
    expect(repo.listSessions()).toHaveLength(1)
    expect(createXpRepository().read().totalXp).toBe(10)
  })
  it('isolates demo data entirely from localStorage', () => {
    const get = vi.spyOn(Storage.prototype, 'getItem')
    const set = vi.spyOn(Storage.prototype, 'setItem')
    const xp = createXpRepository(true)
    const repo = createCardioRepository(date, xp)
    repo.addSession(date, input)
    repo.updateSession('demo-cardio', input)
    repo.deleteSession('demo-cardio')
    xp.backfill({}, [], [], repo.listSessions())
    expect(repo.listSessions()).toHaveLength(1)
    expect(get).not.toHaveBeenCalled()
    expect(set).not.toHaveBeenCalled()
  })
  it('backfills existing sessions once', () => {
    const repo = createCardioRepository(date)
    const xp = createXpRepository()
    xp.backfill({}, [], [], repo.listSessions())
    xp.backfill({}, [], [], repo.listSessions())
    expect(createXpRepository().read()).toEqual({ totalXp: 10, awarded: { 'cardio:demo-cardio': 10 } })
  })
  it('includes cardio in streaks, comeback history, badges and daily XP', () => {
    const repo = createCardioRepository(undefined, createXpRepository(true))
    repo.addSession('2026-06-02', input, 'old')
    const before = getHomeSummary([], [], {}, [], date, repo.listSessions())
    expect(before).toMatchObject({ streak: 0, comebackDay: true, recordedToday: false })
    repo.addSession(date, input, 'today')
    repo.addSession(date, input, 'today2')
    const sessions = repo.listSessions()
    expect(getHomeSummary([], [], {}, [], date, sessions)).toMatchObject({ streak: 1, totalDays: 2, comebackDay: true, recordedToday: true })
    expect(getHomeSummary([], [], {}, [], '2026-06-05', sessions).streak).toBe(1)
    expect(getHomeSummary([], [], {}, [], date).streak).toBe(0)
    expect(getBadgeMetrics([], [], {}, [], [], date, sessions).days).toBe(2)
    expect(getDailyWrapUp([], [], {}, [], [], { totalXp: 20, awarded: { 'cardio:today': 10, 'cardio:today2': 10 } }, date, sessions)).toMatchObject({ earnedXp: 20, streak: 1 })
  })
})
