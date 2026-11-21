import { addDays } from './date'
import { detectPersonalBests } from './personalBests'
import type { Exercise } from './types'
import type { WorkoutSet } from './workoutSets'

export function longestStreak(activityDates: readonly string[]): { length: number; start: string; end: string } | null {
  const dates = [...new Set(activityDates)].sort()
  let longest: { length: number; start: string; end: string } | null = null
  let start = ''
  let length = 0
  dates.forEach((date, index) => {
    if (index === 0 || addDays(dates[index - 1], 1) !== date) {
      start = date
      length = 0
    }
    length += 1
    if (!longest || length >= longest.length) longest = { length, start, end: date }
  })
  return longest
}

export function getActivityHistory(activityDates: readonly string[], today: string) {
  const dates = [...new Set(activityDates)].filter((date) => date <= today)
  const yesterday = addDays(today, -1)
  const previous = dates.filter((date) => date < today).sort().at(-1)
  return {
    totalDays: dates.length,
    longest: longestStreak(dates),
    broken: !dates.includes(today) && !dates.includes(yesterday) && dates.some((date) => date < yesterday),
    comebackDay: previous === addDays(today, -2),
    recordedToday: dates.includes(today),
  }
}

export function countPersonalBestUpdates(sets: readonly WorkoutSet[], exercises: readonly Exercise[]) {
  const histories = new Map<string, WorkoutSet[]>()
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]))
  let count = 0
  const ordered = [...sets].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt))
  for (const set of ordered) {
    const exercise = byId.get(set.exerciseId)
    if (!exercise) continue
    const history = histories.get(set.exerciseId) ?? []
    count += detectPersonalBests(history, set, exercise.bodyweight).filter((best) => best.kind === 'improved').length
    history.push(set)
    histories.set(set.exerciseId, history)
  }
  return count
}
