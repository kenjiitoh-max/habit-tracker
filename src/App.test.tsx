import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { getRepository } from './lib/storage'

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
})

describe('habit management', () => {
  it('adds, edits, cancels deletion and confirms deletion', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(await screen.findByText('筋トレ')).toBeInTheDocument()
    await user.click(screen.getByTestId('add-habit-button'))
    expect(screen.getByTestId('save-habit-button')).toBeDisabled()
    await user.type(screen.getByTestId('habit-name-input'), '読書')
    await user.type(screen.getByTestId('habit-unit-input'), 'ページ')
    await user.click(screen.getByTestId('save-habit-button'))
    expect(await screen.findByText('読書')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '読書を編集' }))
    await user.clear(screen.getByTestId('habit-name-input'))
    await user.type(screen.getByTestId('habit-name-input'), '散歩')
    await user.click(screen.getByTestId('save-habit-button'))
    expect(await screen.findByText('散歩')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '散歩を削除' }))
    await user.click(screen.getByRole('button', { name: 'キャンセル' }))
    expect(screen.getByText('散歩')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '散歩を削除' }))
    await user.click(screen.getByTestId('confirm-delete-button'))
    await waitFor(() => expect(screen.queryByText('散歩')).not.toBeInTheDocument())
  })
  it('displays an empty state after all habits have been removed', async () => {
    const repo = getRepository()
    for (const habit of await repo.listHabits()) await repo.deleteHabit(habit.id)
    render(<App />)
    expect(await screen.findByTestId('empty-state')).toBeInTheDocument()
  })
  it('shows storage load errors', async () => {
    const spy = vi.spyOn(getRepository(), 'listHabits').mockRejectedValueOnce(new Error('unavailable'))
    render(<App />)
    expect(await screen.findByRole('alert')).toHaveTextContent('データを読み込めませんでした')
    spy.mockRestore()
  })
  it('keeps the form open when saving fails', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('筋トレ')
    await user.click(screen.getByTestId('add-habit-button'))
    await user.type(screen.getByTestId('habit-name-input'), '読書')
    const spy = vi.spyOn(getRepository(), 'createHabit').mockRejectedValueOnce(new Error('quota'))
    await user.click(screen.getByTestId('save-habit-button'))
    expect(await screen.findByRole('alert')).toHaveTextContent('保存できませんでした')
    expect(screen.getByTestId('habit-name-input')).toHaveValue('読書')
    spy.mockRestore()
  })
})
