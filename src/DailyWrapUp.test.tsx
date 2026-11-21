import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import DailyWrapUp from './DailyWrapUp'
import { createStudyTimeRepository } from './lib/studyTime'
import { createWorkoutSetRepository } from './lib/workoutSets'
import { createXpRepository } from './lib/xp'

it('shows an empty day then positive no-PR feedback after a study record', () => {
  const xpRepository = createXpRepository(true)
  const studyRepository = createStudyTimeRepository(undefined, xpRepository)
  const props = { habits: [], logs: [], exercises: [], date: '2026-06-03', studyRepository, workoutRepository: createWorkoutSetRepository(), xpRepository, loading: false, error: false }
  const { rerender } = render(<DailyWrapUp {...props} />)
  expect(screen.getByText(/まだ今日の記録はありません/)).toBeInTheDocument()
  studyRepository.saveMinutes(props.date, 'shadoten', 15)
  rerender(<DailyWrapUp {...props} />)
  expect(screen.getByText(/今日は自己ベスト更新なし/)).toBeInTheDocument()
  expect(screen.getByText('今日 +10 XP')).toBeInTheDocument()
  expect(screen.queryByText(/まだ今日の記録はありません/)).not.toBeInTheDocument()
})

it('reports unreadable records without claiming no records', () => {
  const studyRepository = createStudyTimeRepository()
  studyRepository.listDays = () => { throw new Error('unavailable') }
  render(<DailyWrapUp habits={[]} logs={[]} exercises={[]} date="2026-06-03" studyRepository={studyRepository} workoutRepository={createWorkoutSetRepository()} xpRepository={createXpRepository(true)} loading={false} error={false} />)
  expect(screen.getByRole('alert')).toHaveTextContent('今日の成果を読み込めませんでした')
  expect(screen.queryByText(/まだ今日の記録はありません/)).not.toBeInTheDocument()
})
