import type { WorkoutSet } from './workoutSets'

type Metric = 'weight' | 'reps' | 'volume'
type Bests = Partial<Record<Metric, number>>

export interface PersonalBest {
  metric: Metric
  value: number
  kind: 'first' | 'improved'
}

function summarize(sets: WorkoutSet[], bodyweight: boolean): Bests {
  const bests: Bests = {}
  const dailyVolume = new Map<string, { total: number; correction: number }>()
  for (const { date, reps, weightKg } of sets) {
    bests.reps = Math.max(bests.reps ?? reps, reps)
    if (bodyweight || weightKg === undefined) continue
    bests.weight = Math.max(bests.weight ?? weightKg, weightKg)
    const { total, correction } = dailyVolume.get(date) ?? { total: 0, correction: 0 }
    const adjusted = weightKg * reps - correction
    const next = total + adjusted
    dailyVolume.set(date, { total: next, correction: (next - total) - adjusted })
  }
  for (const { total } of dailyVolume.values()) {
    bests.volume = Math.max(bests.volume ?? total, total)
  }
  return bests
}

export function detectPersonalBests(history: WorkoutSet[], saved: WorkoutSet, bodyweight: boolean): PersonalBest[] {
  const previous = summarize(history, bodyweight)
  const session = [...history.filter((set) => set.date === saved.date && set.id !== saved.id), saved]
  const current = summarize(session, bodyweight)
  const metrics: Metric[] = ['weight', 'reps', 'volume']
  return metrics.flatMap((metric): PersonalBest[] => {
    const value = current[metric]
    if (value === undefined) return []
    const best = previous[metric]
    if (best === undefined) return [{ metric, value, kind: 'first' }]
    const tolerance = metric === 'volume' ? Math.abs(best) * Number.EPSILON * 2 : 0
    return value - best > tolerance ? [{ metric, value, kind: 'improved' }] : []
  })
}
