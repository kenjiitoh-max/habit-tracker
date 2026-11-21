import { addDays } from './date'
import type { HabitLog } from './types'

export function getStreak(habitId: string, logs: readonly HabitLog[], todayKey: string): number {
  let day = addDays(todayKey, 0)
  const doneDays = new Set(logs.filter((log) => log.habitId === habitId && log.done).map((log) => log.date))
  if (!doneDays.has(day)) day = addDays(day, -1)
  let count = 0
  while (doneDays.has(day)) {
    count += 1
    day = addDays(day, -1)
  }
  return count
}
