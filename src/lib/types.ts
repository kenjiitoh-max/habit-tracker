export type BodyPart = 'back' | 'shoulders' | 'chest' | 'arms' | 'legs'

export interface Exercise {
  id: string
  name: string
  bodyPart: BodyPart
  bodyweight: boolean
  preset?: boolean
  createdAt: string
}

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
