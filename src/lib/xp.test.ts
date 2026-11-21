import { afterEach, expect, it, vi } from 'vitest'
import { COMEBACK_XP, createXpRepository, getLevel, XP_CHANGED, XP_STORAGE_KEY } from './xp'
import { createStudyTimeRepository } from './studyTime'
import { createWorkoutSetRepository, WORKOUT_SETS_STORAGE_KEY } from './workoutSets'

afterEach(() => vi.restoreAllMocks())

it('awards study XP only from one minute, including during backfill', () => {
  const xp = createXpRepository()
  const study = createStudyTimeRepository(undefined, xp)
  study.saveMinutes('2026-01-01', 'shadoten', 0.5)
  xp.backfill(study.listDays(), [])
  expect(xp.read()).toEqual({ totalXp: 0, awarded: {} })
  study.saveMinutes('2026-01-01', 'shadoten', 1)
  expect(xp.read().totalXp).toBe(10)
  xp.backfill({ '2026-01-02': { shadoten: 0.5, spiful: 1 } }, [])
  expect(xp.read()).toEqual({ totalXp: 20, awarded: { 'study:2026-01-01:shadoten': 10, 'study:2026-01-02:spiful': 10 } })
})

it('backfills many records with one read, one write and one notification only when changed', () => {
  const xp = createXpRepository()
  const days = Object.fromEntries(Array.from({ length: 100 }, (_, index) => [`day-${index}`, { shadoten: 10, spiful: 5 }]))
  const sets = Array.from({ length: 100 }, (_, index) => ({ id: `set-${index}`, date: '2026-01-01', exerciseId: 'a', reps: 10, createdAt: 'x' }))
  const read = vi.spyOn(Storage.prototype, 'getItem')
  const write = vi.spyOn(Storage.prototype, 'setItem')
  const dispatch = vi.spyOn(window, 'dispatchEvent')
  xp.backfill(days, sets)
  expect(read).toHaveBeenCalledTimes(1)
  expect(write).toHaveBeenCalledTimes(1)
  expect(dispatch).toHaveBeenCalledTimes(1)
  expect(dispatch.mock.calls[0][0].type).toBe(XP_CHANGED)
  expect(xp.read().totalXp).toBe(3000)
  write.mockClear()
  dispatch.mockClear()
  xp.backfill(days, sets)
  xp.backfill({}, [])
  expect(write).not.toHaveBeenCalled()
  expect(dispatch).not.toHaveBeenCalled()
})

it('awards once per record and never subtracts on edits, deletion or reload', () => {
  const xp = createXpRepository()
  const study = createStudyTimeRepository(undefined, xp)
  const sets = createWorkoutSetRepository(undefined, xp)
  study.saveMinutes('2026-01-01', 'shadoten', 0)
  expect(xp.read().totalXp).toBe(0)
  study.saveMinutes('2026-01-01', 'shadoten', 15)
  study.saveMinutes('2026-01-01', 'shadoten', 30)
  study.saveMinutes('2026-01-01', 'shadoten', 0)
  const set = sets.addSet('2026-01-01', { exerciseId: 'a', reps: 10 }, true)
  sets.updateSet(set.id, { exerciseId: 'a', reps: 20 }, true)
  sets.deleteSet(set.id)
  xp.backfill(study.listDays(), sets.listAllSets())
  expect(createXpRepository().read()).toEqual({ totalXp: 20, awarded: { 'study:2026-01-01:shadoten': 10, [`set:${set.id}`]: 10 } })
})

it.each([0, 99, 100, 199, 200])('calculates level at %i XP', (total) => {
  expect(getLevel(total)).toEqual({ level: Math.floor(total / 100) + 1, xpIntoLevel: total % 100, xpToNext: 100 - total % 100 })
})

it('treats missing and corrupt XP as empty without writing on read', () => {
  const xp = createXpRepository()
  expect(xp.read()).toEqual({ totalXp: 0, awarded: {} })
  for (const raw of ['bad json', 'null', '{"totalXp":-1,"awarded":{}}', '{"totalXp":10,"awarded":[]}', '{"totalXp":10,"awarded":{"a":"10"}}']) {
    localStorage.setItem(XP_STORAGE_KEY, raw)
    expect(xp.read()).toEqual({ totalXp: 0, awarded: {} })
    expect(localStorage.getItem(XP_STORAGE_KEY)).toBe(raw)
  }
})

it('backfills historical records once and leaves all existing keys byte-for-byte unchanged', () => {
  const records = {
    'habit-tracker:v1': ' {"habits":[], "logs":[]} ',
    'habit-tracker:body:v1': '{ "measurements": [] }',
    'habit-tracker:body-targets:v1': '{ "weightKg": 68 }',
    'habit-tracker:study-time:v1': '{ "2025-01-01": {"shadoten":20,"spiful":0}, "2025-01-02":{"spiful":5} }',
    [WORKOUT_SETS_STORAGE_KEY]: '{ "sets": [{"id":"old","date":"2025-01-01","exerciseId":"a","reps":10,"createdAt":"x"}] }',
  }
  for (const [key, raw] of Object.entries(records)) localStorage.setItem(key, raw)
  const xp = createXpRepository()
  for (let i = 0; i < 2; i++) xp.backfill(createStudyTimeRepository().listDays(), createWorkoutSetRepository().listAllSets())
  expect(xp.read().totalXp).toBe(30)
  for (const [key, raw] of Object.entries(records)) expect(localStorage.getItem(key)).toBe(raw)
})

it('retries a saved set after XP write failure without duplicating it', () => {
  const original = Storage.prototype.setItem
  const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
    if (key === XP_STORAGE_KEY) throw new Error('quota')
    original.call(localStorage, key, value)
  })
  const sets = createWorkoutSetRepository()
  const input = { exerciseId: 'a', reps: 10 }
  expect(() => sets.addSet('2026-01-01', input, true, 'pending')).toThrow('quota')
  expect(sets.listAllSets()).toHaveLength(1)
  spy.mockRestore()
  sets.addSet('2026-01-01', input, true, 'pending')
  sets.addSet('2026-01-01', input, true, 'pending')
  expect(sets.listAllSets()).toHaveLength(1)
  expect(createXpRepository().read().totalXp).toBe(10)
})

it('uses only demo data and never reads or writes real XP', () => {
  localStorage.setItem(XP_STORAGE_KEY, 'private data')
  const read = vi.spyOn(Storage.prototype, 'getItem')
  const write = vi.spyOn(Storage.prototype, 'setItem')
  const xp = createXpRepository(true)
  const study = createStudyTimeRepository('2026-01-02', xp)
  const sets = createWorkoutSetRepository('2026-01-02', xp)
  xp.backfill(study.listDays(), sets.listAllSets())
  expect(xp.read().totalXp).toBe(230)
  study.saveMinutes('2026-01-03', 'shadoten', 10)
  sets.addSet('2026-01-02', { exerciseId: 'a', reps: 5 }, true)
  expect(xp.read().totalXp).toBe(250)
  expect(read).not.toHaveBeenCalled()
  expect(write).not.toHaveBeenCalled()
})

it('awards the comeback bonus once per day on top of existing XP and keeps it after reload', () => {
  localStorage.setItem(XP_STORAGE_KEY, JSON.stringify({ totalXp: 40, awarded: { 'study:2026-06-01:shadoten': 10 } }))
  const xp = createXpRepository()
  expect(xp.hasComeback('2026-06-03')).toBe(false)
  xp.awardComeback('2026-06-03')
  xp.awardComeback('2026-06-03')
  expect(createXpRepository().read()).toEqual({ totalXp: 40 + COMEBACK_XP, awarded: { 'study:2026-06-01:shadoten': 10, 'comeback:2026-06-03': COMEBACK_XP } })
  expect(xp.hasComeback('2026-06-03')).toBe(true)
  expect(xp.hasComeback('2026-06-04')).toBe(false)
})
