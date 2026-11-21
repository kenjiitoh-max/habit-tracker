import { addDays } from './date'
import { createXpRepository, xpRepository } from './xp'
import type { XpRepository } from './xp'

export interface WorkoutSet {
  id: string
  date: string
  exerciseId: string
  reps: number
  weightKg?: number
  createdAt: string
}

export type WorkoutSetInput = Pick<WorkoutSet, 'exerciseId' | 'reps' | 'weightKg'>

export const WORKOUT_SETS_STORAGE_KEY = 'habit-tracker:workout-sets:v1'
const MAX_WEIGHT_KG = 1000
const MAX_REPS = 1000

export function normalizeSet(input: WorkoutSetInput, bodyweight: boolean): WorkoutSetInput {
  if (!input.exerciseId) throw new Error('種目を選択してください。')
  if (!Number.isInteger(input.reps) || input.reps < 1 || input.reps > MAX_REPS) throw new Error('回数は1以上の整数で入力してください。')
  if (bodyweight) return { exerciseId: input.exerciseId, reps: input.reps }
  if (typeof input.weightKg !== 'number' || !Number.isFinite(input.weightKg) || input.weightKg < 0 || input.weightKg > MAX_WEIGHT_KG) {
    throw new Error('重量は0以上の数値（kg）で入力してください。')
  }
  return { exerciseId: input.exerciseId, reps: input.reps, weightKg: input.weightKg }
}

function isWorkoutSet(value: unknown): value is WorkoutSet {
  if (!value || typeof value !== 'object') return false
  const item = value as WorkoutSet
  return typeof item.id === 'string' && typeof item.date === 'string' && typeof item.exerciseId === 'string'
    && typeof item.reps === 'number' && typeof item.createdAt === 'string'
    && (item.weightKg === undefined || typeof item.weightKg === 'number')
}

function readStored(): WorkoutSet[] {
  const raw = localStorage.getItem(WORKOUT_SETS_STORAGE_KEY)
  if (raw === null) return []
  const data: unknown = JSON.parse(raw)
  if (!data || typeof data !== 'object' || !('sets' in data) || !Array.isArray(data.sets) || !data.sets.every(isWorkoutSet)) {
    throw new Error('筋トレの記録を読み込めませんでした。')
  }
  return data.sets
}

export function createWorkoutSetRepository(demoDate?: string, xp: XpRepository = demoDate ? createXpRepository(true) : xpRepository) {
  let demoSets: WorkoutSet[] = demoDate ? [
    ...[[7, 55], [3, 57.5]].map(([daysAgo, weightKg]) => {
      const date = addDays(demoDate, -daysAgo)
      return { id: `demo-bench-${daysAgo}-days-ago`, date, exerciseId: 'preset-chest-bench-press', weightKg, reps: 10, createdAt: `${date}T21:00:00+09:00` }
    }),
    ...[[60, 10], [60, 8], [62.5, 6]].map(([weightKg, reps], index) => ({ id: `demo-bench-${index}`, date: addDays(demoDate, -1), exerciseId: 'preset-chest-bench-press', weightKg, reps, createdAt: `${addDays(demoDate, -1)}T21:0${index}:00+09:00` })),
    ...[12, 10].map((reps, index) => ({ id: `demo-pullup-${index}`, date: addDays(demoDate, -1), exerciseId: 'preset-back-pullup', reps, createdAt: `${addDays(demoDate, -1)}T21:1${index}:00+09:00` })),
    { id: 'demo-squat-0', date: demoDate, exerciseId: 'preset-legs-squat', weightKg: 80, reps: 8, createdAt: `${demoDate}T21:00:00+09:00` },
  ] : []
  const read = () => demoDate ? demoSets : readStored()
  const write = (sets: WorkoutSet[]) => {
    if (demoDate) demoSets = sets
    else localStorage.setItem(WORKOUT_SETS_STORAGE_KEY, JSON.stringify({ sets }))
  }

  return {
    previousSet(exerciseId: string, beforeDate: string): WorkoutSet | undefined {
      const previous = read().filter((item) => item.exerciseId === exerciseId && item.date < beforeDate).reverse()
        .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))[0]
      return previous ? { ...previous } : undefined
    },
    listAllSets(): WorkoutSet[] { return read().map((item) => ({ ...item })) },
    listSets(date: string): WorkoutSet[] {
      return read().filter((item) => item.date === date).map((item) => ({ ...item }))
    },
    addSet(date: string, input: WorkoutSetInput, bodyweight: boolean, id: string = crypto.randomUUID()): WorkoutSet {
      const sets = read()
      const existing = sets.find((item) => item.id === id)
      const set: WorkoutSet = existing ?? { ...normalizeSet(input, bodyweight), id, date, createdAt: new Date().toISOString() }
      if (!existing) write([...sets, set])
      xp.awardSet(set.id)
      return { ...set }
    },
    updateSet(id: string, input: WorkoutSetInput, bodyweight: boolean): WorkoutSet {
      const sets = read()
      const index = sets.findIndex((item) => item.id === id)
      if (index === -1) throw new Error('セットが見つかりません。')
      const { id: _id, date, createdAt } = sets[index]
      const next: WorkoutSet = { id: _id, date, createdAt, ...normalizeSet(input, bodyweight) }
      write(sets.map((item, i) => i === index ? next : item))
      return { ...next }
    },
    deleteSet(id: string): void {
      const sets = read()
      write(sets.filter((item) => item.id !== id))
    },
  }
}

export type WorkoutSetRepository = ReturnType<typeof createWorkoutSetRepository>

export function formatSet(set: Pick<WorkoutSet, 'reps' | 'weightKg'>): string {
  return set.weightKg === undefined ? `${set.reps}回` : `${set.weightKg} kg × ${set.reps}回`
}

export function groupByExercise(sets: WorkoutSet[]): [string, WorkoutSet[]][] {
  const groups = new Map<string, WorkoutSet[]>()
  for (const set of [...sets].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    groups.set(set.exerciseId, [...(groups.get(set.exerciseId) ?? []), set])
  }
  return [...groups]
}
