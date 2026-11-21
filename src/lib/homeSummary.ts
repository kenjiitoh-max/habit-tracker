import { getStreak } from './streak'
import { studyServices } from './studyTime'
import type { StudyDays, StudyService } from './studyTime'
import type { Habit, HabitLog } from './types'
import type { WorkoutSet } from './workoutSets'

export function getHomeSummary(habits: Habit[], logs: HabitLog[], days: StudyDays, sets: WorkoutSet[], date: string) {
  const recorded = (value: number | undefined) => typeof value === 'number' && Number.isFinite(value) && value >= 0
  const items = [
    { label: '筋トレ', target: 'workout-exercise', done: sets.some((set) => set.date === date) },
    ...(Object.keys(studyServices) as StudyService[]).map((service) => ({
      label: studyServices[service], target: `study-${service}`, done: recorded(days[date]?.[service]),
    })),
    ...habits.map((habit) => ({ label: habit.name, target: `habit-${habit.id}`, done: logs.some((log) => log.habitId === habit.id && log.date === date && log.done) })),
  ]
  const activityDates = new Set([
    ...logs.filter((log) => log.done && habits.some((habit) => habit.id === log.habitId)).map((log) => log.date),
    ...Object.entries(days).filter(([, minutes]) => minutes && Object.values(minutes).some(recorded)).map(([day]) => day),
    ...sets.map((set) => set.date),
  ])
  const streak = getStreak('activity', [...activityDates].map((day) => ({ habitId: 'activity', date: day, done: true })), date)
  const unrecorded = items.filter((item) => !item.done)
  return { unrecorded, allDone: unrecorded.length === 0, streak }
}
