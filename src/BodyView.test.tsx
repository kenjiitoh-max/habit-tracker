import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { BODY_STORAGE_KEY, getBodyRepository } from './lib/bodyStorage'
import { addDays, today } from './lib/date'

beforeEach(() => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', '') }
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
})
afterEach(() => {
  vi.restoreAllMocks()
  history.replaceState(null, '', '/')
})

describe('body tab', () => {
  it('records weight and body fat separately, corrects and deletes them', async () => {
    const user = userEvent.setup()
    render(<App />)
    await screen.findByText('筋トレ')
    await user.click(screen.getByTestId('nav-body'))
    expect(await screen.findByTestId('body-empty')).toBeInTheDocument()
    await user.type(screen.getByTestId('body-weight-input'), '68.4')
    await user.click(screen.getByTestId('body-save-button'))
    expect(await screen.findByTestId('body-item')).toHaveTextContent('68.4 kg ／ —')
    expect(await getBodyRepository().listMeasurements()).toEqual([{ date: today(), weightKg: 68.4 }])

    await user.type(screen.getByTestId('body-fat-input'), '17.9')
    await user.click(screen.getByRole('button', { name: '記録を修正する' }))
    expect(await screen.findByText('68.4 kg ／ 17.9%')).toBeInTheDocument()

    const yesterday = addDays(today(), -1)
    fireEvent.change(screen.getByTestId('body-date-input'), { target: { value: yesterday } })
    expect(screen.getByTestId('body-weight-input')).toHaveValue(null)
    await user.type(screen.getByTestId('body-fat-input'), '18.3')
    await user.click(screen.getByTestId('body-save-button'))
    expect(await screen.findAllByTestId('body-item')).toHaveLength(2)

    const first = within(screen.getAllByTestId('body-item')[0])
    await user.click(first.getByRole('button', { name: /修正$/ }))
    expect(screen.getByTestId('body-weight-input')).toHaveValue(68.4)
    await user.click(first.getByRole('button', { name: /削除$/ }))
    expect(await getBodyRepository().listMeasurements()).toEqual([{ date: yesterday, bodyFatPercent: 18.3 }])
  })

  it('removes an existing record when both fields are cleared and saved', async () => {
    const user = userEvent.setup()
    await getBodyRepository().saveMeasurement({ date: today(), weightKg: 70.2 })
    render(<App />)
    await screen.findByText('筋トレ')
    await user.click(screen.getByTestId('nav-body'))
    expect(await screen.findByTestId('body-item')).toHaveTextContent('70.2 kg')
    await user.clear(screen.getByTestId('body-weight-input'))
    expect(screen.getByTestId('body-save-button')).toBeEnabled()
    await user.click(screen.getByTestId('body-save-button'))
    expect(await screen.findByTestId('body-empty')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('記録を削除しました')
    expect(await getBodyRepository().listMeasurements()).toEqual([])
    expect(screen.getByTestId('body-save-button')).toBeDisabled()
  })

  it('keeps body measurements off the home screen and out of habit data', async () => {
    const user = userEvent.setup()
    await getBodyRepository().saveMeasurement({ date: today(), weightKg: 71.3, bodyFatPercent: 20.1 })
    render(<App />)
    await screen.findByText('筋トレ')
    expect(screen.queryByText(/71\.3/)).not.toBeInTheDocument()
    expect(screen.getAllByTestId('habit-item')).toHaveLength(2)
    expect(screen.getAllByTestId('streak-count').map((item) => item.textContent)).toEqual(['0日連続', '0日連続'])
    await user.click(screen.getByTestId('nav-stats'))
    expect(screen.queryByText(/71\.3/)).not.toBeInTheDocument()
    await user.click(screen.getByTestId('nav-body'))
    expect(await screen.findByText('71.3 kg ／ 20.1%')).toBeInTheDocument()
  })

  it('rejects out-of-range values without saving', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByTestId('nav-body'))
    await user.type(await screen.findByTestId('body-fat-input'), '120')
    await user.click(screen.getByTestId('body-save-button'))
    expect(await screen.findByRole('alert')).toHaveTextContent('体脂肪率は0より大きく100未満')
    expect(localStorage.getItem(BODY_STORAGE_KEY)).toBeNull()
  })

  it('shows only fake measurements in demo mode without reading real storage', async () => {
    history.replaceState(null, '', '/habit-tracker/?demo=1')
    const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('must not read') })
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('must not write') })
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByTestId('nav-body'))
    expect((await screen.findAllByTestId('body-item')).length).toBeGreaterThan(30)
    await user.clear(screen.getByTestId('body-weight-input'))
    await user.type(screen.getByTestId('body-weight-input'), '80')
    await user.click(screen.getByTestId('body-save-button'))
    expect(await screen.findByRole('status')).toHaveTextContent('保存しました')
    expect(read).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
  })
})
