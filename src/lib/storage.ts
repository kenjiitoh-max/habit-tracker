import type { Exercise, Habit, HabitLog } from './types'
import { createPresets, isExercise, normalizeExercise } from './exercises'
import type { ExerciseInput } from './exercises'
import { createDemoRepository } from './demoRepository'
import { today } from './date'

export type HabitInput = Pick<Habit, 'name' | 'unit' | 'color'>
export interface LogRange { start: string; end: string }

export interface HabitRepository {
  listExercises(): Promise<Exercise[]>
  createExercise(input: ExerciseInput): Promise<Exercise>
  updateExercise(id: string, changes: Partial<ExerciseInput>): Promise<Exercise>
  listHabits(): Promise<Habit[]>
  createHabit(input: HabitInput): Promise<Habit>
  updateHabit(id: string, changes: Partial<HabitInput & Pick<Habit, 'order'>>): Promise<Habit>
  deleteHabit(id: string): Promise<void>
  listLogs(range?: LogRange): Promise<HabitLog[]>
  upsertLog(log: HabitLog): Promise<void>
  deleteLog(habitId: string, date: string): Promise<void>
}

interface StoredData { habits: Habit[]; logs: HabitLog[]; exercises: Exercise[] }
const STORAGE_KEY = 'habit-tracker:v1'

function read(): StoredData {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw === null) {
    const data: StoredData = {
      habits: [
        { id: crypto.randomUUID(), name: '筋トレ', unit: '回', createdAt: new Date().toISOString(), order: 0 },
        { id: crypto.randomUUID(), name: '英語トレーニング', unit: '分', createdAt: new Date().toISOString(), order: 1 },
      ],
      logs: [],
      exercises: createPresets(),
    }
    write(data)
    return data
  }
  const data: unknown = JSON.parse(raw)
  if (!data || typeof data !== 'object' || !('habits' in data) || !('logs' in data)
    || !Array.isArray(data.habits) || !Array.isArray(data.logs)) {
    throw new Error('保存データを読み込めませんでした。')
  }
  if ('exercises' in data) {
    if (!Array.isArray(data.exercises) || !data.exercises.every(isExercise)) throw new Error('保存データを読み込めませんでした。')
  } else {
    const migrated = { ...data, exercises: createPresets() } as StoredData
    write(migrated)
    return migrated
  }
  return data as StoredData
}

function write(data: StoredData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function normalize(input: HabitInput): HabitInput {
  const name = input.name.trim()
  if (!name) throw new Error('習慣の名前を入力してください。')
  return { ...input, name, unit: input.unit?.trim() || undefined }
}

const repository: HabitRepository = {
  async listExercises() { return read().exercises },
  async createExercise(input) {
    const normalized = normalizeExercise(input)
    const data = read()
    const exercise = { ...normalized, id: crypto.randomUUID(), createdAt: new Date().toISOString() }
    data.exercises.push(exercise)
    write(data)
    return exercise
  },
  async updateExercise(id, changes) {
    const data = read()
    const index = data.exercises.findIndex((item) => item.id === id)
    if (index === -1) throw new Error('種目が見つかりません。')
    data.exercises[index] = { ...data.exercises[index], ...normalizeExercise({ ...data.exercises[index], ...changes }) }
    write(data)
    return data.exercises[index]
  },
  async listHabits() {
    return read().habits.sort((a, b) => a.order - b.order)
  },
  async createHabit(input) {
    const normalized = normalize(input)
    const data = read()
    const habit: Habit = { ...normalized, id: crypto.randomUUID(), createdAt: new Date().toISOString(), order: Math.max(-1, ...data.habits.map((h) => h.order)) + 1 }
    data.habits.push(habit)
    write(data)
    return habit
  },
  async updateHabit(id, changes) {
    const data = read()
    const index = data.habits.findIndex((h) => h.id === id)
    if (index === -1) throw new Error('習慣が見つかりません。')
    const habit = { ...data.habits[index], ...changes }
    data.habits[index] = { ...habit, ...normalize(habit) }
    write(data)
    return data.habits[index]
  },
  async deleteHabit(id) {
    const data = read()
    data.habits = data.habits.filter((h) => h.id !== id)
    data.logs = data.logs.filter((log) => log.habitId !== id)
    write(data)
  },
  async listLogs(range) {
    return read().logs.filter((log) => !range || (log.date >= range.start && log.date <= range.end))
  },
  async upsertLog(log) {
    const data = read()
    if (!data.habits.some((h) => h.id === log.habitId)) throw new Error('習慣が見つかりません。')
    data.logs = data.logs.filter((item) => item.habitId !== log.habitId || item.date !== log.date)
    data.logs.push({ ...log })
    write(data)
  },
  async deleteLog(habitId, date) {
    const data = read()
    data.logs = data.logs.filter((log) => log.habitId !== habitId || log.date !== date)
    write(data)
  },
}

let demoRepository: HabitRepository | undefined

export function isDemoMode(): boolean {
  return new URLSearchParams(window.location.search).get('demo') === '1'
}

export function getRepository(): HabitRepository {
  if (isDemoMode()) {
    demoRepository ??= createDemoRepository(today())
    return demoRepository
  }
  return repository
}
