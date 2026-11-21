import { act, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import XpCard from './XpCard'
import { BODY_STORAGE_KEY, getBodyRepository } from './lib/bodyStorage'
import { createStudyTimeRepository } from './lib/studyTime'
import { createWorkoutSetRepository, WORKOUT_SETS_STORAGE_KEY } from './lib/workoutSets'
import { createXpRepository } from './lib/xp'

function renderCard() {
  const repository = createXpRepository()
  render(<XpCard repository={repository} studyRepository={createStudyTimeRepository(undefined, repository)}
    workoutRepository={createWorkoutSetRepository(undefined, repository)} bodyRepository={getBodyRepository(repository)} />)
  return repository
}

it.each(['{broken', '{"measurements":[null]}'])('backfills study and set XP despite invalid body storage %s, without overwriting it', async (raw) => {
  localStorage.setItem(BODY_STORAGE_KEY, raw)
  localStorage.setItem('habit-tracker:study-time:v1', JSON.stringify({ '2026-01-01': { shadoten: 15 } }))
  localStorage.setItem(WORKOUT_SETS_STORAGE_KEY, JSON.stringify({ sets: [
    { id: 'old-set', date: '2026-01-01', exerciseId: 'bench', reps: 10, createdAt: '2026-01-01' },
  ] }))
  const repository = renderCard()
  await waitFor(() => expect(screen.getByTestId('total-xp')).toHaveTextContent('累計 20 XP'))
  expect(repository.read()).toEqual({ totalXp: 20, awarded: { 'study:2026-01-01:shadoten': 10, 'set:old-set': 10 } })
  if (raw === '{broken') expect(screen.getByRole('alert')).toHaveTextContent('過去の記録のXPを反映できませんでした。')
  else expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(localStorage.getItem(BODY_STORAGE_KEY)).toBe(raw)
})

it('still reports other backfill failures', async () => {
  localStorage.setItem('habit-tracker:study-time:v1', '{broken')
  const repository = renderCard()
  expect(await screen.findByRole('alert')).toHaveTextContent('過去の記録のXPを反映できませんでした。')
  expect(repository.read().totalXp).toBe(0)
})

it('leaves empty records at zero XP without an error', async () => {
  renderCard()
  await waitFor(() => expect(screen.getByTestId('total-xp')).toHaveTextContent('累計 0 XP'))
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

function setup() {
  const repository = createXpRepository(true)
  const studyRepository = createStudyTimeRepository(undefined, repository)
  const workoutRepository = createWorkoutSetRepository(undefined, repository)
  return { repository, studyRepository, workoutRepository, bodyRepository: getBodyRepository(repository) }
}

describe('レベルアップの通知', () => {
  it('空の記録やレベルが上がらない記録では祝わず、境界を超えた時だけ通知し自動で閉じる', async () => {
    const props = setup()
    render(<XpCard {...props} />)
    await act(async () => {})
    expect(screen.queryByTestId('level-up')).not.toBeInTheDocument()
    act(() => { for (let i = 0; i < 9; i++) props.repository.awardSet(`set-${i}`) })
    expect(screen.queryByTestId('level-up')).not.toBeInTheDocument()
    vi.useFakeTimers()
    try {
      act(() => props.repository.awardSet('next'))
      expect(screen.getByRole('status')).toHaveTextContent('レベルアップ！ レベル 2')
      act(() => vi.advanceTimersByTime(5000))
      expect(screen.queryByTestId('level-up')).not.toBeInTheDocument()
    } finally { vi.useRealTimers() }
  })

  it('過去の記録の反映では通知を出さない', async () => {
    const props = setup()
    vi.spyOn(props.studyRepository, 'listDays').mockReturnValue(Object.fromEntries(
      Array.from({ length: 10 }, (_, i) => [`2026-01-${i + 1}`, { shadoten: 10 }]),
    ))
    render(<XpCard {...props} />)
    await waitFor(() => expect(screen.getByTestId('total-xp')).toHaveTextContent('累計 100 XP'))
    expect(screen.queryByTestId('level-up')).not.toBeInTheDocument()
  })

  it('読み取りに失敗した場合はエラーを伝え、祝わない', async () => {
    const props = setup()
    vi.spyOn(props.studyRepository, 'listDays').mockImplementation(() => { throw new Error('保存エラー') })
    render(<XpCard {...props} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('過去の記録のXPを反映できませんでした')
    expect(screen.queryByTestId('level-up')).not.toBeInTheDocument()
  })
})
