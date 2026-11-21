import { describe, expect, it, vi } from 'vitest'
import { getRepository } from './storage'
import { createDemoRepository } from './demoRepository'
import { createPresets } from './exercises'
import type { BodyPart } from './types'

const key = 'habit-tracker:v1'

it('migrates v1 without changing habits or logs and saves only once', async () => {
  const old = { habits: [{ id: 'old', name: '筋トレ', order: 0, createdAt: '2025-01-01' }], logs: [{ habitId: 'old', date: '2026-01-01', done: true, value: 42 }] }
  localStorage.setItem(key, JSON.stringify(old))
  const write = vi.spyOn(Storage.prototype, 'setItem')
  const repo = getRepository()
  expect(await repo.listExercises()).toEqual(createPresets())
  expect(JSON.parse(localStorage.getItem(key)!)).toEqual({ ...old, exercises: createPresets() })
  await repo.listExercises()
  await repo.listHabits()
  expect(write).toHaveBeenCalledTimes(1)
  write.mockRestore()
})

it('preserves intentionally empty exercises and rejects corrupt data without overwriting', async () => {
  localStorage.setItem(key, JSON.stringify({ habits: [], logs: [], exercises: [] }))
  expect(await getRepository().listExercises()).toEqual([])
  for (const exercises of [null, {}, [{ name: 'broken' }]]) {
    const raw = JSON.stringify({ habits: [], logs: [], exercises })
    localStorage.setItem(key, raw)
    await expect(getRepository().listExercises()).rejects.toThrow()
    expect(localStorage.getItem(key)).toBe(raw)
  }
})

describe.each(['local', 'demo'])('%s exercise repository', (mode) => {
  it('seeds five parts, adds and edits without changing ids, habits or logs', async () => {
    const repo = mode === 'local' ? getRepository() : createDemoRepository('2026-01-02')
    const habits = await repo.listHabits()
    const logs = await repo.listLogs()
    const presets = await repo.listExercises()
    expect(new Set(presets.map((item) => item.bodyPart)).size).toBe(5)
    expect(presets.filter((item) => item.bodyweight).map((item) => item.name)).toEqual(['懸垂', '腕立て伏せ'])
    const added = await repo.createExercise({ name: ' ロウ ', bodyPart: 'back', bodyweight: false })
    expect(added.name).toBe('ロウ')
    const edited = await repo.updateExercise(added.id, { name: '自重ロウ', bodyPart: 'arms', bodyweight: true, ...({ id: 'replace' } as object) })
    expect(edited).toEqual({ ...added, name: '自重ロウ', bodyPart: 'arms', bodyweight: true })
    const preset = await repo.updateExercise(presets[0].id, { name: 'ワイド懸垂' })
    expect(preset.id).toBe(presets[0].id)
    expect(await repo.listHabits()).toEqual(habits)
    expect(await repo.listLogs()).toEqual(logs)
    expect((await repo.listExercises()).find((item) => item.id === added.id)).toEqual(edited)
    await expect(repo.createExercise({ name: ' ', bodyPart: 'back', bodyweight: false })).rejects.toThrow()
    await expect(repo.createExercise({ name: 'x', bodyPart: 'invalid' as BodyPart, bodyweight: false })).rejects.toThrow()
    await expect(repo.updateExercise(added.id, { name: '' })).rejects.toThrow()
    await expect(repo.updateExercise(added.id, { bodyPart: 'invalid' as BodyPart })).rejects.toThrow()
    await expect(repo.updateExercise('missing', { name: 'x' })).rejects.toThrow()
  })
})

it('demo exercise changes never access localStorage and reset with a new repository', async () => {
  const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw Error('private') })
  const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('private') })
  try {
    const repo = createDemoRepository('2026-01-02')
    const [preset] = await repo.listExercises()
    preset.name = 'external'
    expect((await repo.listExercises())[0].name).toBe('懸垂')
    const added = await repo.createExercise({ name: 'デモ種目', bodyPart: 'legs', bodyweight: true })
    await repo.updateExercise(added.id, { name: 'デモ編集' })
    expect(await createDemoRepository('2026-01-02').listExercises()).toEqual(createPresets())
    expect(read).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
  } finally { vi.restoreAllMocks() }
})
