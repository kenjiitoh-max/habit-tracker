import { addDays, toDateKey } from './date'
import type { Habit, HabitLog } from './types'

export type StatsPeriod = 7 | 30

export interface AchievementRate {
  done: number
  total: number
  percent: number | null
}

function rate(done: number, total: number): AchievementRate {
  return { done, total, percent: total === 0 ? null : (done / total) * 100 }
}

export function getPeriodStats(habits: readonly Habit[], logs: readonly HabitLog[], end: string, days: StatsPeriod) {
  const dates = Array.from({ length: days }, (_, index) => addDays(end, index - days + 1))
  const created = new Map(habits.map((habit) => [habit.id, toDateKey(new Date(habit.createdAt))]))
  const doneDates = new Map(habits.map((habit) => [habit.id, new Set(
    logs.filter((log) => log.habitId === habit.id && log.done).map((log) => log.date),
  )]))
  const daily = dates.map((date) => {
    const eligible = habits.filter((habit) => created.get(habit.id)! <= date)
    const done = eligible.filter((habit) => doneDates.get(habit.id)!.has(date)).length
    return { date, ...rate(done, eligible.length) }
  })
  const perHabit = habits.map((habit) => {
    const eligible = dates.filter((date) => created.get(habit.id)! <= date)
    const done = eligible.filter((date) => doneDates.get(habit.id)!.has(date)).length
    return { habitId: habit.id, ...rate(done, eligible.length) }
  })
  const summary = rate(daily.reduce((sum, day) => sum + day.done, 0), daily.reduce((sum, day) => sum + day.total, 0))
  return { daily, perHabit, summary }
}
