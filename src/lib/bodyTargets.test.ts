import { afterEach, expect, it, vi } from 'vitest'
import { BODY_TARGETS_KEY, createTargetRepository, getTargetRepository, latestMeasurement, targetStatus } from './bodyTargets'

afterEach(() => { vi.restoreAllMocks(); history.replaceState(null, '', '/') })

it('distinguishes unset, unmeasured, reached and differences in either direction', () => {
  expect(targetStatus(undefined, undefined, 'kg')).toBe('目標は未設定です')
  expect(targetStatus(undefined, 68, 'kg')).toBe('まだ測定値がありません')
  expect(targetStatus(68, 68, 'kg')).toBe('目標に到達しています')
  expect(targetStatus(70.3, 68, 'kg')).toBe('目標まで あと 2.3 kg（現在は目標より上）')
  expect(targetStatus(17.2, 18, '%ポイント')).toBe('目標まで あと 0.8 %ポイント（現在は目標より下）')
})

it('finds the latest measured value independently per metric', () => {
  const items = [{ date: '2026-01-01', weightKg: 70 }, { date: '2026-01-03', bodyFatPercent: 18 }, { date: '2026-01-02', weightKg: 69 }]
  expect(latestMeasurement(items, 'weightKg')?.weightKg).toBe(69)
  expect(latestMeasurement(items, 'bodyFatPercent')?.bodyFatPercent).toBe(18)
  expect(latestMeasurement([], 'weightKg')).toBeUndefined()
})

it('adds a separate key and supports changing and clearing independent targets', async () => {
  localStorage.setItem('habit-tracker:body:v1', '{"measurements":[]}')
  localStorage.setItem('habit-tracker:v1', 'existing data')
  const repo = createTargetRepository(false)
  expect(await repo.load()).toEqual({})
  await repo.save({ weightKg: 68, bodyFatPercent: 18 })
  expect(await createTargetRepository(false).load()).toEqual({ weightKg: 68, bodyFatPercent: 18 })
  await repo.save({ bodyFatPercent: 19 })
  expect(await repo.load()).toEqual({ bodyFatPercent: 19 })
  await repo.save({ weightKg: 70 })
  expect(await repo.load()).toEqual({ weightKg: 70 })
  await repo.save({})
  expect(await repo.load()).toEqual({})
  expect(localStorage.getItem('habit-tracker:body:v1')).toBe('{"measurements":[]}')
  expect(localStorage.getItem('habit-tracker:v1')).toBe('existing data')
})

it('rejects invalid values, corrupt reads and storage errors', async () => {
  const repo = createTargetRepository(false)
  for (const weightKg of [0, -1, 500, NaN, Infinity]) await expect(repo.save({ weightKg })).rejects.toThrow()
  await expect(repo.save({ bodyFatPercent: 100 })).rejects.toThrow()
  expect(localStorage.getItem(BODY_TARGETS_KEY)).toBeNull()
  for (const raw of ['{broken', 'null', '[]', '{"weightKg":"68"}']) {
    localStorage.setItem(BODY_TARGETS_KEY, raw)
    await expect(repo.load()).rejects.toThrow()
    expect(localStorage.getItem(BODY_TARGETS_KEY)).toBe(raw)
  }
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
  await expect(repo.save({ weightKg: 68 })).rejects.toThrow('quota')
})

it('uses fake targets in demo without any storage reads or writes', async () => {
  history.replaceState(null, '', '/?demo=1')
  const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('real read') })
  const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('real write') })
  const repo = getTargetRepository()
  expect(await repo.load()).toEqual({ weightKg: 68, bodyFatPercent: 17 })
  await repo.save({ weightKg: 65 })
  expect(await repo.load()).toEqual({ weightKg: 65 })
  await repo.save({})
  expect(await repo.load()).toEqual({})
  expect(read).not.toHaveBeenCalled()
  expect(write).not.toHaveBeenCalled()
})
