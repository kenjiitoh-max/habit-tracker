import { expect, it } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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

it('backfills study and set XP even when body storage is corrupt, without overwriting measurements', async () => {
  localStorage.setItem(BODY_STORAGE_KEY, '{broken')
  localStorage.setItem('habit-tracker:study-time:v1', JSON.stringify({ '2026-01-01': { shadoten: 15 } }))
  localStorage.setItem(WORKOUT_SETS_STORAGE_KEY, JSON.stringify({ sets: [
    { id: 'old-set', date: '2026-01-01', exerciseId: 'bench', reps: 10, createdAt: '2026-01-01' },
  ] }))
  const repository = renderCard()
  await waitFor(() => expect(screen.getByTestId('total-xp')).toHaveTextContent('累計 20 XP'))
  expect(repository.read()).toEqual({ totalXp: 20, awarded: { 'study:2026-01-01:shadoten': 10, 'set:old-set': 10 } })
  expect(screen.getByRole('alert')).toHaveTextContent('過去の記録のXPを反映できませんでした。')
  expect(localStorage.getItem(BODY_STORAGE_KEY)).toBe('{broken')
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
