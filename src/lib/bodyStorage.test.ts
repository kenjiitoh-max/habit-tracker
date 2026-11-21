import { afterEach, describe, expect, it, vi } from 'vitest'
import { BODY_STORAGE_KEY, createDemoBodyRepository, getBodyRepository } from './bodyStorage'
import { getRepository } from './storage'
import { createXpRepository, XP_STORAGE_KEY } from './xp'
import { getHomeSummary } from './homeSummary'

afterEach(() => {
  vi.restoreAllMocks()
  history.replaceState(null, '', '/')
})

describe('body repository', () => {
  const repo = getBodyRepository()

  it('awards five XP per date regardless of values, edits, deletion or reload', async () => {
    const date = '2026-01-01'
    const summary = () => getHomeSummary([], [], { '2025-12-30': { shadoten: 10 } }, [], date)
    const before = summary()
    await repo.saveMeasurement({ date })
    expect(createXpRepository().read().totalXp).toBe(0)
    await repo.saveMeasurement({ date, weightKg: 70, bodyFatPercent: 20 })
    await repo.saveMeasurement({ date, weightKg: 60 })
    await repo.deleteMeasurement(date)
    expect(createXpRepository().read().totalXp).toBe(5)
    await getBodyRepository().saveMeasurement({ date, bodyFatPercent: 19 })
    await repo.saveMeasurement({ date })
    await repo.saveMeasurement({ date: '2025-12-01', weightKg: 80 })
    expect(createXpRepository().read()).toEqual({ totalXp: 10, awarded: { 'body:2026-01-01': 5, 'body:2025-12-01': 5 } })
    expect(summary()).toEqual(before)
    expect(summary()).toMatchObject({ streak: 0, totalDays: 1, recordedToday: false, comebackDay: true })
  })

  it('retries XP write failure without duplicating a saved measurement or award', async () => {
    const original = Storage.prototype.setItem
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (key, value) {
      if (key === XP_STORAGE_KEY) throw new Error('quota')
      original.call(localStorage, key, value)
    })
    const measurement = { date: '2026-01-01', weightKg: 70 }
    await expect(repo.saveMeasurement(measurement)).rejects.toThrow('quota')
    expect(await repo.listMeasurements()).toEqual([measurement])
    write.mockRestore()
    await repo.saveMeasurement(measurement)
    await repo.saveMeasurement(measurement)
    expect(createXpRepository().read().totalXp).toBe(5)
    expect(await repo.listMeasurements()).toEqual([measurement])
  })

  it('does not award XP when saving the measurement fails', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    await expect(repo.saveMeasurement({ date: '2026-01-01', weightKg: 70 })).rejects.toThrow('quota')
    expect(createXpRepository().read().totalXp).toBe(0)
  })

  it('saves, corrects, partially records and deletes measurements by date', async () => {
    expect(await repo.listMeasurements()).toEqual([])
    expect(localStorage.getItem(BODY_STORAGE_KEY)).toBeNull()
    await repo.saveMeasurement({ date: '2026-01-01', weightKg: 70.2, bodyFatPercent: 18.5 })
    await repo.saveMeasurement({ date: '2026-01-03', weightKg: 69.8 })
    await repo.saveMeasurement({ date: '2026-01-02', bodyFatPercent: 18.1 })
    expect(await repo.listMeasurements()).toEqual([
      { date: '2026-01-03', weightKg: 69.8 },
      { date: '2026-01-02', bodyFatPercent: 18.1 },
      { date: '2026-01-01', weightKg: 70.2, bodyFatPercent: 18.5 },
    ])
    await repo.saveMeasurement({ date: '2026-01-01', weightKg: 70 })
    expect((await repo.listMeasurements())[2]).toEqual({ date: '2026-01-01', weightKg: 70 })
    await repo.saveMeasurement({ date: '2026-01-03' })
    await repo.deleteMeasurement('2026-01-02')
    expect(await repo.listMeasurements()).toEqual([{ date: '2026-01-01', weightKg: 70 }])
  })

  it('keeps habit data untouched and out of habit logs', async () => {
    const habits = await getRepository().listHabits()
    const before = localStorage.getItem('habit-tracker:v1')
    await repo.saveMeasurement({ date: '2026-01-01', weightKg: 70 })
    expect(localStorage.getItem('habit-tracker:v1')).toBe(before)
    expect(await getRepository().listHabits()).toEqual(habits)
    expect(await getRepository().listLogs()).toEqual([])
  })

  it('rejects invalid values without writing', async () => {
    await expect(repo.saveMeasurement({ date: '2026-01-01', weightKg: 0 })).rejects.toThrow()
    await expect(repo.saveMeasurement({ date: '2026-01-01', weightKg: Number.NaN })).rejects.toThrow()
    await expect(repo.saveMeasurement({ date: '2026-01-01', bodyFatPercent: 100 })).rejects.toThrow()
    await expect(repo.saveMeasurement({ date: '2026-02-30', weightKg: 70 })).rejects.toThrow()
    expect(localStorage.getItem(BODY_STORAGE_KEY)).toBeNull()
  })

  it('reports corrupt data without overwriting it', async () => {
    localStorage.setItem(BODY_STORAGE_KEY, '{broken')
    await expect(repo.listMeasurements()).rejects.toThrow()
    await expect(repo.saveMeasurement({ date: '2026-01-01', weightKg: 70 })).rejects.toThrow()
    expect(localStorage.getItem(BODY_STORAGE_KEY)).toBe('{broken')
  })

  it('uses fake in-memory data in demo mode without touching storage', async () => {
    history.replaceState(null, '', '/habit-tracker/?demo=1')
    const read = vi.spyOn(Storage.prototype, 'getItem')
    const write = vi.spyOn(Storage.prototype, 'setItem')
    const xp = createXpRepository(true)
    const demo = getBodyRepository(xp)
    const items = await demo.listMeasurements()
    expect(items.length).toBeGreaterThan(30)
    expect(items.some((item) => item.bodyFatPercent === undefined)).toBe(true)
    await demo.saveMeasurement({ date: items[0].date, weightKg: 99.9 })
    expect((await demo.listMeasurements())[0]).toEqual({ date: items[0].date, weightKg: 99.9 })
    xp.backfill({}, [], await demo.listMeasurements())
    expect(xp.read().totalXp).toBe(items.length * 5)
    expect(read).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
  })

  it('builds the same demo data for the same day', async () => {
    expect(await createDemoBodyRepository('2026-01-02').listMeasurements())
      .toEqual(await createDemoBodyRepository('2026-01-02').listMeasurements())
  })
})
