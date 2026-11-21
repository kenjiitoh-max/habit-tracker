export interface Habit {
  id: string
  name: string
  unit?: string
  color?: string
  createdAt: string
  order: number
}

export interface HabitLog {
  habitId: string
  date: string
  done: boolean
  value?: number
}
