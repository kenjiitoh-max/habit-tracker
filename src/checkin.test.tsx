import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { getRepository } from './lib/storage'
import { addDays, today } from './lib/date'

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
})
afterEach(() => vi.restoreAllMocks())

async function firstCard() {
  await screen.findByText('筋トレ')
  return within(screen.getAllByTestId('habit-item')[0])
}

describe('daily check-in', () => {
  it('keeps a typed value when tapping the toggle before leaving the input', async () => {
    const user = userEvent.setup()
    render(<App />)
    const card = await firstCard()
    await user.type(card.getByTestId('checkin-value-input'), '25')
    await user.click(card.getByTestId('checkin-toggle'))
    expect(card.getByTestId('checkin-toggle')).toHaveAttribute('aria-pressed', 'true')
    const [habit] = await getRepository().listHabits()
    await waitFor(async () => expect(await getRepository().listLogs({ start: today(), end: today() }))
      .toEqual([{ habitId: habit.id, date: today(), done: true, value: 25 }]))
  })

  it('toggles today, keeps yesterday’s streak, and persists across remounts', async () => {
    const user = userEvent.setup()
    const repo = getRepository()
    const [habit] = await repo.listHabits()
    await repo.upsertLog({ habitId: habit.id, date: addDays(today(), -1), done: true })
    const view = render(<App />)
    let card = await firstCard()
    expect(card.getByTestId('streak-count')).toHaveTextContent('1日連続')
    await user.click(card.getByTestId('checkin-toggle'))
    expect(card.getByTestId('checkin-toggle')).toHaveAttribute('aria-pressed', 'true')
    expect(card.getByTestId('streak-count')).toHaveTextContent('2日連続')
    view.unmount()
    render(<App />)
    card = await firstCard()
    expect(card.getByTestId('checkin-toggle')).toHaveAttribute('aria-pressed', 'true')
    await user.click(card.getByTestId('checkin-toggle'))
    expect(card.getByTestId('checkin-toggle')).toHaveAttribute('aria-pressed', 'false')
    expect(card.getByTestId('streak-count')).toHaveTextContent('1日連続')
    expect(await repo.listLogs({ start: today(), end: today() })).toEqual([])
  })

  it('saves numeric values as done, preserves zero, clears only the value, and deletes on toggle', async () => {
    const user = userEvent.setup()
    const view = render(<App />)
    let card = await firstCard()
    await user.type(card.getByTestId('checkin-value-input'), '30.5{Enter}')
    await waitFor(() => expect(card.getByTestId('checkin-toggle')).toHaveAttribute('aria-pressed', 'true'))
    expect((await getRepository().listLogs())[0]).toMatchObject({ value: 30.5, date: today(), done: true })
    view.unmount()
    render(<App />)
    card = await firstCard()
    expect(card.getByTestId('checkin-value-input')).toHaveValue(30.5)
    await user.clear(card.getByTestId('checkin-value-input'))
    await user.type(card.getByTestId('checkin-value-input'), '0{Enter}')
    await waitFor(async () => expect((await getRepository().listLogs())[0].value).toBe(0))
    await user.clear(card.getByTestId('checkin-value-input'))
    await user.tab()
    await waitFor(async () => expect((await getRepository().listLogs())[0].value).toBeUndefined())
    expect(card.getByTestId('checkin-toggle')).toHaveAttribute('aria-pressed', 'true')
    await user.click(card.getByTestId('checkin-toggle'))
    expect(await getRepository().listLogs()).toEqual([])
  })

  it('leaves blank values unrecorded and rejects negative values', async () => {
    const user = userEvent.setup()
    render(<App />)
    const card = await firstCard()
    await user.click(card.getByTestId('checkin-value-input'))
    await user.tab()
    expect(await getRepository().listLogs()).toEqual([])
    await user.type(card.getByTestId('checkin-value-input'), '-1{Enter}')
    expect(card.getByRole('alert')).toHaveTextContent('0以上の数値')
    expect(await getRepository().listLogs()).toEqual([])
  })

  it('reports failed writes and deletes without changing the saved state', async () => {
    const user = userEvent.setup()
    render(<App />)
    const card = await firstCard()
    const repo = getRepository()
    vi.spyOn(repo, 'upsertLog').mockRejectedValueOnce(new Error('quota'))
    await user.click(card.getByTestId('checkin-toggle'))
    expect(card.getByRole('alert')).toHaveTextContent('記録を保存できませんでした')
    expect(card.getByTestId('checkin-toggle')).toHaveAttribute('aria-pressed', 'false')
    await user.click(card.getByTestId('checkin-toggle'))
    vi.spyOn(repo, 'deleteLog').mockRejectedValueOnce(new Error('quota'))
    await user.click(card.getByTestId('checkin-toggle'))
    expect(card.getByTestId('checkin-toggle')).toHaveAttribute('aria-pressed', 'true')
    expect(card.getByRole('alert')).toHaveTextContent('記録を保存できませんでした')
  })
})
