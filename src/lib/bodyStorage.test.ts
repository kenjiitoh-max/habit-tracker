import { afterEach, describe, expect, it, vi } from 'vitest'
import { BODY_STORAGE_KEY, createDemoBodyRepository, getBodyRepository } from './bodyStorage'
import { getRepository } from './storage'

afterEach(() => {
  vi.restoreAllMocks()
  history.replaceState(null, '', '/')
})

describe('body repository', () => {
  const repo = getBodyRepository()

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
    const demo = getBodyRepository()
    const items = await demo.listMeasurements()
    expect(items.length).toBeGreaterThan(30)
    expect(items.some((item) => item.bodyFatPercent === undefined)).toBe(true)
    await demo.saveMeasurement({ date: items[0].date, weightKg: 99.9 })
    expect((await demo.listMeasurements())[0]).toEqual({ date: items[0].date, weightKg: 99.9 })
    expect(read).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
  })

  it('builds the same demo data for the same day', async () => {
    expect(await createDemoBodyRepository('2026-01-02').listMeasurements())
      .toEqual(await createDemoBodyRepository('2026-01-02').listMeasurements())
  })
})
