import type { BodyPart, Exercise } from './types'

export type ExerciseInput = Pick<Exercise, 'name' | 'bodyPart' | 'bodyweight'>
export const bodyParts: Record<BodyPart, string> = { back: '背中', shoulders: '肩', chest: '胸', arms: '腕', legs: '脚' }

export function normalizeExercise(input: ExerciseInput): ExerciseInput {
  const name = input.name.trim()
  if (!name) throw new Error('種目の名前を入力してください。')
  if (!Object.hasOwn(bodyParts, input.bodyPart)) throw new Error('部位を選択してください。')
  if (typeof input.bodyweight !== 'boolean') throw new Error('自重種目の設定を確認してください。')
  return { name, bodyPart: input.bodyPart, bodyweight: input.bodyweight }
}

export function createPresets(): Exercise[] {
  const items: [BodyPart, string, string, boolean][] = [
    ['back', 'pullup', '懸垂', true],
    ['back', 'lat-pulldown', 'ラットプルダウン', false],
    ['back', 'deadlift', 'デッドリフト', false],
    ['shoulders', 'press', 'ショルダープレス', false],
    ['shoulders', 'lateral-raise', 'サイドレイズ', false],
    ['chest', 'bench-press', 'ベンチプレス', false],
    ['chest', 'pushup', '腕立て伏せ', true],
    ['arms', 'curl', 'アームカール', false],
    ['arms', 'triceps-extension', 'トライセプスエクステンション', false],
    ['legs', 'squat', 'スクワット', false],
    ['legs', 'lunge', 'ランジ', false],
  ]
  return items.map(([bodyPart, key, name, bodyweight]) => ({
    id: `preset-${bodyPart}-${key}`, name, bodyPart, bodyweight, preset: true, createdAt: '2026-01-01T00:00:00.000Z',
  }))
}

export function isExercise(value: unknown): value is Exercise {
  if (!value || typeof value !== 'object') return false
  const item = value as Exercise
  return typeof item.id === 'string' && typeof item.name === 'string' && !!item.name.trim()
    && Object.hasOwn(bodyParts, item.bodyPart) && typeof item.bodyweight === 'boolean'
    && typeof item.createdAt === 'string' && (item.preset === undefined || typeof item.preset === 'boolean')
}
