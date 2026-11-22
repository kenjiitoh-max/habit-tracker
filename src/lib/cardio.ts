import { addDays } from './date'
import { createXpRepository, xpRepository } from './xp'
import type { XpRepository } from './xp'

export const CARDIO_KEY = 'habit-tracker:cardio:v1'
export const cardioTypes = ['ランニング', 'ウォーキング', 'バイク', '水泳', 'その他'] as const
export interface CardioSession {
  id: string
  date: string
  type: typeof cardioTypes[number]
  minutes: number
  distanceKm?: number
  createdAt: string
}
export type CardioInput = Pick<CardioSession, 'type' | 'minutes' | 'distanceKm'>

export function normalizeCardio(input: CardioInput): CardioInput {
  if (!cardioTypes.includes(input.type)) throw new Error('運動の種類を選択してください。')
  if (!Number.isSafeInteger(input.minutes) || input.minutes <= 0) throw new Error('時間は1以上の整数（分）で入力してください。')
  if (input.distanceKm !== undefined && (!Number.isFinite(input.distanceKm) || input.distanceKm <= 0)) throw new Error('距離は0より大きい数値（km）で入力してください。')
  return { type: input.type, minutes: input.minutes, ...(input.distanceKm === undefined ? {} : { distanceKm: input.distanceKm }) }
}

function readStored(): CardioSession[] {
  try {
    const data = JSON.parse(localStorage.getItem(CARDIO_KEY) ?? 'null')
    if (!data || !Array.isArray(data.sessions)) return []
    for (const session of data.sessions) {
      if (!session || typeof session.id !== 'string' || typeof session.createdAt !== 'string') return []
      addDays(session.date, 0)
      normalizeCardio(session)
    }
    return data.sessions
  } catch { return [] }
}

export function createCardioRepository(demoDate?: string, xp: XpRepository = demoDate ? createXpRepository(true) : xpRepository) {
  let memory: CardioSession[] = demoDate ? [{ id: 'demo-cardio', date: demoDate, type: 'ウォーキング', minutes: 20, distanceKm: 1.5, createdAt: `${demoDate}T08:00:00+09:00` }] : []
  const read = () => demoDate ? memory : readStored()
  const write = (sessions: CardioSession[]) => {
    if (demoDate) memory = sessions
    else localStorage.setItem(CARDIO_KEY, JSON.stringify({ sessions }))
  }
  return {
    listSessions(): CardioSession[] { return read().map((session) => ({ ...session })) },
    addSession(date: string, input: CardioInput, id: string = crypto.randomUUID()): CardioSession {
      addDays(date, 0)
      const normalized = normalizeCardio(input)
      const sessions = read()
      const existing = sessions.find((session) => session.id === id)
      const session = existing ?? { ...normalized, id, date, createdAt: new Date().toISOString() }
      if (!existing) write([...sessions, session])
      xp.awardCardio(id)
      return { ...session }
    },
    updateSession(id: string, input: CardioInput) {
      const sessions = read()
      const existing = sessions.find((session) => session.id === id)
      if (!existing) throw new Error('記録が見つかりません。')
      const session = { id, date: existing.date, createdAt: existing.createdAt, ...normalizeCardio(input) }
      write(sessions.map((item) => item.id === id ? session : item))
    },
    deleteSession(id: string) { write(read().filter((session) => session.id !== id)) },
  }
}
export type CardioRepository = ReturnType<typeof createCardioRepository>
