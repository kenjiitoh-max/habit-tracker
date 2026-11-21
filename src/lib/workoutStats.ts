import type { WorkoutSet } from './workoutSets'

export interface WorkoutDay {
  date: string
  maxWeight: number | null
  volume: number | null
}

export function getWorkoutDays(sets: WorkoutSet[], exerciseId: string): WorkoutDay[] {
  const days = new Map<string, WorkoutDay>()
  for (const { date, exerciseId: id, weightKg, reps } of sets) {
    if (id !== exerciseId) continue
    const day = days.get(date) ?? { date, maxWeight: null, volume: null }
    if (weightKg !== undefined) {
      day.maxWeight = Math.max(day.maxWeight ?? weightKg, weightKg)
      day.volume = (day.volume ?? 0) + weightKg * reps
    }
    days.set(date, day)
  }
  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date))
}
