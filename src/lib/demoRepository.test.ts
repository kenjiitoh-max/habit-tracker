import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { addDays, toDateKey } from './date'
import { getStreak } from './streak'

beforeEach(() => {
  vi.resetModules()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-01T16:00:00Z'))
  history.replaceState(null, '', '/habit-tracker/?demo=1')
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
  history.replaceState(null, '', '/')
})

async function loadDemo() {
  const { getRepository } = await import('./storage')
  return getRepository()
}

describe('demo repository selected through storage', () => {
  it('is deterministic across reloads and shifts dates relative to today JST', async () => {
    const repo = await loadDemo()
    const habits = await repo.listHabits()
    const logs = await repo.listLogs()
    vi.resetModules()
    const reloaded = await loadDemo()
    expect(await reloaded.listHabits()).toEqual(habits)
    expect(await reloaded.listLogs()).toEqual(logs)
    vi.setSystemTime(new Date('2026-01-02T16:00:00Z'))
    vi.resetModules()
    const shifted = await (await loadDemo()).listLogs()
    expect(shifted).toEqual(logs.map((log) => ({ ...log, date: addDays(log.date, 1) })))
  })

  it('covers exactly 60 days, realistic rates, active streaks and mid-period creation', async () => {
    const repo = await loadDemo()
    const habits = await repo.listHabits()
    const logs = await repo.listLogs()
    const dates = [...new Set(logs.map((log) => log.date))].sort()
    expect(dates).toHaveLength(60)
    expect(dates[0]).toBe('2025-11-04')
    expect(dates.at(-1)).toBe('2026-01-02')
    expect(habits).toHaveLength(4)
    expect(toDateKey(new Date(habits[3].createdAt))).toBe('2025-12-09')
    for (const habit of habits) {
      const records = logs.filter((log) => log.habitId === habit.id)
      const rate = records.filter((log) => log.done).length / records.length
      expect(rate).toBeGreaterThanOrEqual(.6)
      expect(rate).toBeLessThanOrEqual(.9)
      expect(records.every((log) => log.date >= toDateKey(new Date(habit.createdAt)))).toBe(true)
      expect(records.filter((log) => log.done).every((log) => log.value! > 0)).toBe(true)
    }
    expect(getStreak(habits[0].id, logs, '2026-01-02')).toBe(4)
    expect(getStreak(habits[3].id, logs, '2026-01-02')).toBe(6)
    expect(await repo.listLogs({ start: '2026-01-02', end: '2026-01-02' })).toHaveLength(4)
  })

  it('never reads or writes real storage, even during edits and deletes', async () => {
    const original = '{"private":"do not read"}'
    localStorage.setItem('habit-tracker:v1', original)
    const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('real data read') })
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('real data write') })
    const remove = vi.spyOn(Storage.prototype, 'removeItem')
    const clear = vi.spyOn(Storage.prototype, 'clear')
    const repo = await loadDemo()
    const habit = await repo.createHabit({ name: ' 散歩 ', unit: ' 分 ' })
    expect(habit).toMatchObject({ name: '散歩', unit: '分' })
    await repo.updateHabit(habit.id, { name: 'ウォーキング', order: -1 })
    expect((await repo.listHabits())[0].id).toBe(habit.id)
    await repo.upsertLog({ habitId: habit.id, date: '2026-01-02', done: true, value: 30 })
    await repo.upsertLog({ habitId: habit.id, date: '2026-01-02', done: true, value: 40 })
    expect((await repo.listLogs()).filter((log) => log.habitId === habit.id)).toHaveLength(1)
    await repo.deleteLog(habit.id, '2026-01-02')
    await repo.upsertLog({ habitId: habit.id, date: '2026-01-02', done: true })
    await repo.deleteHabit(habit.id)
    expect((await repo.listLogs()).some((log) => log.habitId === habit.id)).toBe(false)
    expect(read).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
    expect(remove).not.toHaveBeenCalled()
    expect(clear).not.toHaveBeenCalled()
    read.mockRestore()
    expect(localStorage.getItem('habit-tracker:v1')).toBe(original)
  })

  it('isolates returned data, handles empty state, validates errors, and resets on reload', async () => {
    const repo = await loadDemo()
    const habits = await repo.listHabits()
    habits[0].name = 'external mutation'
    expect((await repo.listHabits())[0].name).toBe('筋トレ')
    const logs = await repo.listLogs()
    logs[0].done = !logs[0].done
    expect((await repo.listLogs())[0].done).not.toBe(logs[0].done)
    await expect(repo.createHabit({ name: ' ' })).rejects.toThrow()
    await expect(repo.updateHabit(habits[0].id, { name: '' })).rejects.toThrow()
    await expect(repo.updateHabit('missing', { name: 'x' })).rejects.toThrow()
    await expect(repo.upsertLog({ habitId: 'missing', date: '2026-01-02', done: true })).rejects.toThrow()
    for (const habit of habits) await repo.deleteHabit(habit.id)
    expect(await repo.listHabits()).toEqual([])
    expect(await repo.listLogs()).toEqual([])
    expect(await (await loadDemo()).listHabits()).toEqual([])
    vi.resetModules()
    expect(await (await loadDemo()).listHabits()).toHaveLength(4)
  })

  it('only selects demo for demo=1', async () => {
    const { getRepository, isDemoMode } = await import('./storage')
    for (const search of ['', '?demo=0', '?demo=true']) {
      history.replaceState(null, '', `/habit-tracker/${search}`)
      expect(isDemoMode()).toBe(false)
      expect((await getRepository().listHabits()).map((habit) => habit.name)).toEqual(['筋トレ', '英語トレーニング'])
    }
  })
})
