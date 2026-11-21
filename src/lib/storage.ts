import type { Habit, HabitLog } from './types'

export type HabitInput = Pick<Habit, 'name' | 'unit' | 'color'>
export interface LogRange { start: string; end: string }

export interface HabitRepository {
  listHabits(): Promise<Habit[]>
  createHabit(input: HabitInput): Promise<Habit>
  updateHabit(id: string, changes: Partial<HabitInput & Pick<Habit, 'order'>>): Promise<Habit>
  deleteHabit(id: string): Promise<void>
  listLogs(range?: LogRange): Promise<HabitLog[]>
  upsertLog(log: HabitLog): Promise<void>
  deleteLog(habitId: string, date: string): Promise<void>
}

interface StoredData { habits: Habit[]; logs: HabitLog[] }
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
    }
    write(data)
    return data
  }
  const data: unknown = JSON.parse(raw)
  if (!data || typeof data !== 'object' || !('habits' in data) || !('logs' in data)
    || !Array.isArray(data.habits) || !Array.isArray(data.logs)) {
    throw new Error('保存データを読み込めませんでした。')
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

export function getRepository(): HabitRepository {
  return repository
}
