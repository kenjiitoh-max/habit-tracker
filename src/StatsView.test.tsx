import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import StatsView from './StatsView'
import { getRepository } from './lib/storage'

afterEach(() => vi.restoreAllMocks())

describe('statistics view', () => {
  it('switches between weekly and monthly periods with accessible daily data', async () => {
    const user = userEvent.setup()
    render(<StatsView date="2026-01-02" habits={[{ id: 'a', name: '読書', createdAt: '2025-01-01T00:00:00Z', order: 0 }]} logs={[{ habitId: 'a', date: '2026-01-02', done: true }]} />)
    expect(screen.getByTestId('stats-period-week')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('habit-rate')).toHaveTextContent('14%')
    expect(screen.getByTestId('stats-chart')).toHaveAccessibleName('直近7日間の日別達成率')
    await user.click(screen.getByTestId('stats-period-month'))
    expect(screen.getByTestId('stats-period-month')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('habit-rate')).toHaveTextContent('3%')
    await user.click(screen.getByText('日別データを見る'))
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(31)
    await user.click(screen.getByTestId('stats-period-week'))
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(8)
  })

  it('explains the empty state without displaying NaN or Infinity', () => {
    render(<StatsView date="2026-01-02" habits={[]} logs={[]} />)
    expect(screen.getByText('習慣を追加すると、ここに達成率が表示されます。')).toBeInTheDocument()
    expect(screen.getByTestId('stats-view')).not.toHaveTextContent(/NaN|Infinity/)
    expect(screen.queryAllByTestId('habit-rate')).toHaveLength(0)
  })

  it('is reachable from home and reflects repository logs', async () => {
    HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
    const user = userEvent.setup()
    const repo = getRepository()
    const [habit] = await repo.listHabits()
    const { today } = await import('./lib/date')
    await repo.upsertLog({ habitId: habit.id, date: today(), done: true })
    render(<App />)
    await screen.findByText('筋トレ')
    await user.click(screen.getByRole('button', { name: 'グラフ' }))
    expect(await screen.findByTestId('stats-view')).toBeInTheDocument()
    expect(screen.getAllByTestId('habit-rate')[0]).toHaveTextContent('100%')
    await user.click(screen.getByRole('button', { name: '記録' }))
    expect(screen.getAllByTestId('checkin-toggle')[0]).toHaveAttribute('aria-pressed', 'true')
  })

  it('shows storage errors instead of misleading empty charts', async () => {
    const user = userEvent.setup()
    vi.spyOn(getRepository(), 'listLogs').mockRejectedValueOnce(new Error('unavailable'))
    render(<App />)
    await screen.findByRole('alert')
    await user.click(screen.getByRole('button', { name: 'グラフ' }))
    expect(screen.queryByTestId('stats-view')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('データを読み込めませんでした')
  })
})
