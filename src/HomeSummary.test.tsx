import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import HomeSummary from './HomeSummary'
import { createStudyTimeRepository } from './lib/studyTime'
import { createWorkoutSetRepository } from './lib/workoutSets'

describe('HomeSummary', () => {
  it('does not claim completion while loading', () => {
    render(<HomeSummary habits={[]} logs={[]} date="2026-06-03" studyRepository={createStudyTimeRepository('2026-06-03')} workoutRepository={createWorkoutSetRepository('2026-06-03')} loading error={false} />)
    expect(screen.getByRole('status')).toHaveTextContent('読み込み中')
    expect(screen.queryByText('✓ 達成済み')).not.toBeInTheDocument()
  })
  it('reports read failures rather than showing all done', () => {
    const studyRepository = createStudyTimeRepository('2026-06-03')
    studyRepository.listDays = () => { throw new Error('unavailable') }
    render(<HomeSummary habits={[]} logs={[]} date="2026-06-03" studyRepository={studyRepository} workoutRepository={createWorkoutSetRepository('2026-06-03')} loading={false} error={false} />)
    expect(screen.getByRole('alert')).toHaveTextContent('読み込めませんでした')
    expect(screen.queryByText('✓ 達成済み')).not.toBeInTheDocument()
  })
})
