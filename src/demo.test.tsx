import { afterEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

afterEach(() => {
  vi.restoreAllMocks()
  history.replaceState(null, '', '/')
})

describe('demo UI', () => {
  it('keeps the demo query across views and never accesses real storage', async () => {
    const user = userEvent.setup()
    HTMLDialogElement.prototype.close = function () { this.removeAttribute('open') }
    history.replaceState(null, '', '/habit-tracker/?demo=1&example=ok#top')
    const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('must not read') })
    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('must not write') })
    render(<App />)
    expect(await screen.findByText('英語リスニング')).toBeInTheDocument()
    expect(screen.getByTestId('demo-banner')).toHaveTextContent('デモモード（サンプルデータ）')
    expect(screen.getByRole('link', { name: 'デモを終了して通常モードへ →' })).toHaveAttribute('href', `${window.location.origin}/habit-tracker/?example=ok#top`)
    const shadoten = screen.getByRole('spinbutton', { name: 'シャドテン（分）' })
    expect(shadoten).toHaveValue(20)
    expect(screen.getByRole('spinbutton', { name: 'スピフル（分）' })).toHaveValue(10)
    await user.clear(shadoten)
    await user.type(shadoten, '30')
    await user.click(screen.getByRole('button', { name: 'シャドテンを保存' }))
    await user.click(screen.getAllByTestId('checkin-toggle')[0])
    await user.click(screen.getByRole('button', { name: '昨日の記録' }))
    expect(screen.getByRole('heading', { name: '昨日の記録' })).toBeInTheDocument()
    expect(screen.getByText('英語リスニング')).toBeInTheDocument()
    expect(screen.getByText('シャドテン').nextElementSibling).toHaveTextContent('25 分')
    expect(screen.getByText('スピフル').nextElementSibling).toHaveTextContent('15 分')
    await user.click(screen.getByRole('button', { name: 'グラフ' }))
    await user.click(screen.getByTestId('stats-period-month'))
    expect(screen.getAllByTestId('habit-rate')).toHaveLength(4)
    expect(window.location.search).toBe('?demo=1&example=ok')
    await user.click(screen.getByRole('button', { name: '記録' }))
    expect(screen.getAllByTestId('checkin-toggle')[0]).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('spinbutton', { name: 'シャドテン（分）' })).toHaveValue(30)
    expect(screen.getByRole('spinbutton', { name: 'スピフル（分）' })).toHaveValue(10)
    expect(read).not.toHaveBeenCalled()
    expect(write).not.toHaveBeenCalled()
  })
})
