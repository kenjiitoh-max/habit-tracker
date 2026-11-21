import { addDays } from './date'
import type { HabitInput, HabitRepository } from './storage'
import type { Habit, HabitLog } from './types'

function randomGenerator(seed: number) {
  let state = seed
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0
    return state / 4294967296
  }
}

function normalize(input: HabitInput): HabitInput {
  const name = input.name.trim()
  if (!name) throw new Error('習慣の名前を入力してください。')
  return { ...input, name, unit: input.unit?.trim() || undefined }
}

export function createDemoRepository(todayKey: string): HabitRepository {
  const random = randomGenerator(20260102)
  const samples = [
    { name: '筋トレ', unit: '回', days: 60, rate: .8, streak: 4, min: 15, step: 5, steps: 8 },
    { name: '英語リスニング', unit: '分', days: 60, rate: .72, streak: 2, min: 10, step: 5, steps: 7 },
    { name: '読書', unit: 'ページ', days: 60, rate: .65, streak: 0, min: 5, step: 5, steps: 6 },
    { name: 'ストレッチ', unit: '分', days: 25, rate: .88, streak: 6, min: 5, step: 5, steps: 4 },
  ]
  let habits: Habit[] = samples.map((sample, order) => ({
    id: `demo-${order + 1}`, name: sample.name, unit: sample.unit, order,
    createdAt: `${addDays(todayKey, 1 - sample.days)}T00:00:00+09:00`,
  }))
  let logs: HabitLog[] = []
  for (const [index, sample] of samples.entries()) {
    const doneOffsets = new Set(Array.from({ length: sample.streak }, (_, offset) => offset))
    const candidates = Array.from({ length: sample.days }, (_, offset) => offset)
      .filter((offset) => offset > sample.streak)
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1))
      ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
    }
    for (const offset of candidates.slice(0, Math.round(sample.days * sample.rate) - sample.streak)) doneOffsets.add(offset)
    for (let offset = sample.days - 1; offset >= 0; offset--) {
      const done = doneOffsets.has(offset)
      logs.push({
        habitId: habits[index].id, date: addDays(todayKey, -offset), done,
        ...(done ? { value: sample.min + Math.floor(random() * sample.steps) * sample.step } : {}),
      })
    }
  }

  return {
    async listHabits() {
      return [...habits].sort((a, b) => a.order - b.order).map((habit) => ({ ...habit }))
    },
    async createHabit(input) {
      const habit: Habit = { ...normalize(input), id: crypto.randomUUID(), createdAt: new Date().toISOString(), order: Math.max(-1, ...habits.map((h) => h.order)) + 1 }
      habits.push(habit)
      return { ...habit }
    },
    async updateHabit(id, changes) {
      const index = habits.findIndex((habit) => habit.id === id)
      if (index === -1) throw new Error('習慣が見つかりません。')
      const habit = { ...habits[index], ...changes }
      habits[index] = { ...habit, ...normalize(habit) }
      return { ...habits[index] }
    },
    async deleteHabit(id) {
      habits = habits.filter((habit) => habit.id !== id)
      logs = logs.filter((log) => log.habitId !== id)
    },
    async listLogs(range) {
      return logs.filter((log) => !range || (log.date >= range.start && log.date <= range.end)).map((log) => ({ ...log }))
    },
    async upsertLog(log) {
      if (!habits.some((habit) => habit.id === log.habitId)) throw new Error('習慣が見つかりません。')
      logs = logs.filter((item) => item.habitId !== log.habitId || item.date !== log.date)
      logs.push({ ...log })
    },
    async deleteLog(habitId, date) {
      logs = logs.filter((log) => log.habitId !== habitId || log.date !== date)
    },
  }
}
