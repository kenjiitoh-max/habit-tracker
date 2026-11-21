import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import HomeSummary from './HomeSummary'
import { createStudyTimeRepository } from './lib/studyTime'
import { createWorkoutSetRepository } from './lib/workoutSets'
import { createXpRepository } from './lib/xp'

describe('HomeSummary', () => {
  it('welcomes a return with retained achievements and hides the card after recording', () => {
    const studyRepository = createStudyTimeRepository()
    studyRepository.saveMinutes('2026-06-01', 'shadoten', 10)
    const xpRepository = createXpRepository(true)
    for (let i = 0; i < 12; i++) xpRepository.awardSet(String(i))
    const props = { habits: [], logs: [], date: '2026-06-05', studyRepository, workoutRepository: createWorkoutSetRepository(), xpRepository, loading: false, error: false }
    const { rerender } = render(<HomeSummary {...props} />)
    const card = screen.getByRole('region', { name: '積み上げた成果' })
    expect(card).toHaveTextContent('累計記録日数 1日')
    expect(card).toHaveTextContent('レベル Lv.2')
    expect(card).toHaveTextContent('自己ベスト更新 0回')
    expect(card).toHaveTextContent('最長ストリーク 1日')
    expect(card).toHaveTextContent('2026-06-01〜2026-06-01')
    expect(card).toHaveTextContent('体の測定は含みません')
    studyRepository.saveMinutes(props.date, 'spiful', 0)
    rerender(<HomeSummary {...props} />)
    expect(screen.queryByRole('region', { name: '積み上げた成果' })).not.toBeInTheDocument()
  })
  it('invites a comeback on the day after the first missed day and welcomes the awarded bonus', () => {
    const studyRepository = createStudyTimeRepository()
    studyRepository.saveMinutes('2026-06-01', 'shadoten', 10)
    const xpRepository = createXpRepository(true)
    const props = { habits: [], logs: [], date: '2026-06-03', studyRepository, workoutRepository: createWorkoutSetRepository(), xpRepository, loading: false, error: false }
    const { rerender } = render(<HomeSummary {...props} />)
    expect(screen.getByRole('region', { name: '積み上げた成果' })).toHaveTextContent('復帰ボーナス +30 XP がもらえます')
    expect(screen.queryByText(/おかえりなさい！また始めて/)).not.toBeInTheDocument()
    xpRepository.awardComeback(props.date)
    rerender(<HomeSummary {...props} />)
    expect(screen.getByText(/復帰ボーナス \+30 XP/, { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getByText(/また始めてくれてうれしいです/)).toBeInTheDocument()
  })
  it('does not invite a comeback after the day after the first missed day', () => {
    const studyRepository = createStudyTimeRepository()
    studyRepository.saveMinutes('2026-06-01', 'shadoten', 10)
    render(<HomeSummary habits={[]} logs={[]} date="2026-06-04" studyRepository={studyRepository} workoutRepository={createWorkoutSetRepository()} xpRepository={createXpRepository(true)} loading={false} error={false} />)
    expect(screen.getByRole('region', { name: '積み上げた成果' })).not.toHaveTextContent('復帰ボーナス')
  })
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
