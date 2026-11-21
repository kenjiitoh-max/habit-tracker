import { describe, expect, it, vi } from 'vitest'
import { getRepository } from './storage'

describe('habit repository', () => {
  const repo = getRepository()
  it('seeds once, supports CRUD, and persists an intentionally empty list', async () => {
    const initial = await repo.listHabits()
    expect(initial.map((h) => [h.name, h.unit])).toEqual([['筋トレ', '回'], ['英語トレーニング', '分']])
    expect(await getRepository().listHabits()).toEqual(initial)
    const habit = await repo.createHabit({ name: ' 読書 ', unit: ' 分 ' })
    expect(habit).toMatchObject({ name: '読書', unit: '分', order: 2 })
    expect(await repo.updateHabit(habit.id, { name: '散歩', unit: '', order: -1 })).toMatchObject({ name: '散歩', unit: undefined })
    expect((await repo.listHabits())[0].id).toBe(habit.id)
    for (const h of await repo.listHabits()) await repo.deleteHabit(h.id)
    expect(await getRepository().listHabits()).toEqual([])
  })
  it('upserts, filters inclusive ranges, deletes logs and cascades habit deletion', async () => {
    const [habit] = await repo.listHabits()
    expect(await repo.listLogs()).toEqual([])
    await repo.upsertLog({ habitId: habit.id, date: '2026-01-01', done: false })
    await repo.upsertLog({ habitId: habit.id, date: '2026-01-01', done: true, value: 10 })
    await repo.upsertLog({ habitId: habit.id, date: '2026-01-02', done: true })
    expect(await repo.listLogs({ start: '2026-01-01', end: '2026-01-01' })).toEqual([{ habitId: habit.id, date: '2026-01-01', done: true, value: 10 }])
    await repo.deleteLog(habit.id, '2026-01-02')
    expect(await repo.listLogs()).toHaveLength(1)
    await repo.deleteHabit(habit.id)
    expect(await repo.listLogs()).toEqual([])
  })
  it('rejects invalid names and unknown habits', async () => {
    await expect(repo.createHabit({ name: ' ' })).rejects.toThrow()
    await expect(repo.updateHabit('missing', { name: 'x' })).rejects.toThrow()
    const [habit] = await repo.listHabits()
    await expect(repo.updateHabit(habit.id, { name: '' })).rejects.toThrow()
    await expect(repo.upsertLog({ habitId: 'missing', date: '2026-01-01', done: true })).rejects.toThrow()
  })
  it('reports corrupt data without overwriting it', async () => {
    localStorage.setItem('habit-tracker:v1', '{broken')
    await expect(repo.listHabits()).rejects.toThrow()
    expect(localStorage.getItem('habit-tracker:v1')).toBe('{broken')
    localStorage.setItem('habit-tracker:v1', '{}')
    await expect(repo.listHabits()).rejects.toThrow()
  })
  it('propagates storage failures', async () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    await expect(repo.listHabits()).rejects.toThrow('quota')
    spy.mockRestore()
  })
})
