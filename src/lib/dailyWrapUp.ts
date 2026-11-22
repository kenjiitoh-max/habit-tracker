import type { CardioSession } from './cardio'
import { getHomeSummary } from './homeSummary'
import { detectPersonalBests } from './personalBests'
import type { PersonalBest } from './personalBests'
import type { Exercise, Habit, HabitLog } from './types'
import type { StudyDays } from './studyTime'
import type { WorkoutSet } from './workoutSets'
import type { XpData } from './xp'

export function getDailyWrapUp(habits: Habit[], logs: HabitLog[], days: StudyDays, sets: WorkoutSet[], exercises: Exercise[], xp: XpData, date: string, cardio: CardioSession[] = []) {
  const summary = getHomeSummary(habits, logs, days, sets, date, cardio)
  const setKeys = new Set(sets.filter((set) => set.date === date).map((set) => `set:${set.id}`))
  for (const session of cardio.filter((session) => session.date === date)) setKeys.add(`cardio:${session.id}`)
  const earnedXp = Object.entries(xp.awarded).reduce((total, [key, amount]) =>
    total + (setKeys.has(key) || key.startsWith(`study:${date}:`) || key === `comeback:${date}` ? amount : 0), 0)
  const bests: { exercise: string; best: PersonalBest }[] = []
  for (const exercise of exercises) {
    const history = sets.filter((set) => set.exerciseId === exercise.id && set.date < date)
    const todaySets = sets.filter((set) => set.exerciseId === exercise.id && set.date === date)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    const daily = new Map<PersonalBest['metric'], PersonalBest>()
    for (const set of todaySets) {
      for (const best of detectPersonalBests(history, set, exercise.bodyweight)) daily.set(best.metric, best)
      history.push(set)
    }
    for (const best of daily.values()) bests.push({ exercise: exercise.name, best })
  }
  return { earnedXp, bests, streak: summary.streak, recordedToday: summary.recordedToday }
}
