import { afterEach, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HomeBody from './HomeBody'
import { HOME_BODY_SETTING_KEY, createHomeBodySetting } from './lib/homeBodySetting'

afterEach(() => vi.restoreAllMocks())

async function toggle() {
  const user = userEvent.setup()
  await user.click(screen.getByText('ホームの表示設定'))
  await user.click(screen.getByRole('checkbox'))
}

it('defaults to hidden without reading measurements and persists explicit opt-in across mounts', async () => {
  localStorage.setItem('habit-tracker:body:v1', JSON.stringify({ measurements: [{ date: '2026-01-02', weightKg: 77.7, bodyFatPercent: 22.2 }] }))
  const read = vi.spyOn(Storage.prototype, 'getItem')
  const { unmount } = render(<HomeBody />)
  expect(screen.queryByTestId('home-body-values')).not.toBeInTheDocument()
  expect(read).not.toHaveBeenCalledWith('habit-tracker:body:v1')
  await toggle()
  expect(await screen.findByText(/77.7 kg/)).toBeVisible()
  expect(screen.getByText(/22.2 %/)).toBeVisible()
  unmount()
  render(<HomeBody />)
  expect(await screen.findByText(/77.7 kg/)).toBeVisible()
  await toggle()
  expect(screen.queryByTestId('home-body-values')).not.toBeInTheDocument()
  expect(document.body).not.toHaveTextContent('77.7')
  expect(localStorage.getItem(HOME_BODY_SETTING_KEY)).toBe('false')
})

it('shows an empty state and supports one metric only', async () => {
  const { unmount } = render(<HomeBody />)
  await toggle()
  expect(await screen.findByText('体の記録はまだありません。')).toBeVisible()
  unmount()
  localStorage.setItem('habit-tracker:body:v1', JSON.stringify({ measurements: [{ date: '2026-01-02', bodyFatPercent: 18 }] }))
  render(<HomeBody />)
  expect(await screen.findByText('体重：未記録')).toBeVisible()
  expect(screen.getByText(/18 %/)).toBeVisible()
})

it('fails closed on unavailable settings and reports failed writes', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
  render(<HomeBody />)
  await toggle()
  expect(screen.getByRole('alert')).toHaveTextContent('表示設定を保存できませんでした')
  expect(screen.getByRole('checkbox')).not.toBeChecked()
  expect(screen.queryByTestId('home-body-values')).not.toBeInTheDocument()
})

it('reports measurement read errors without exposing values', async () => {
  localStorage.setItem(HOME_BODY_SETTING_KEY, 'true')
  localStorage.setItem('habit-tracker:body:v1', 'broken')
  render(<HomeBody />)
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('体の記録を読み込めませんでした。'))
})

it('isolates demo settings in memory and leaves existing data untouched', () => {
  localStorage.setItem(HOME_BODY_SETTING_KEY, 'true')
  const original = JSON.stringify({ habits: [], logs: [] })
  localStorage.setItem('habit-tracker:v1', original)
  const read = vi.spyOn(Storage.prototype, 'getItem')
  const write = vi.spyOn(Storage.prototype, 'setItem')
  const demo = createHomeBodySetting(true)
  expect(demo.load()).toBe(false)
  demo.save(true)
  expect(demo.load()).toBe(true)
  expect(createHomeBodySetting(true).load()).toBe(false)
  expect(read).not.toHaveBeenCalled()
  expect(write).not.toHaveBeenCalled()
  const normal = createHomeBodySetting(false)
  expect(normal.load()).toBe(true)
  normal.save(false)
  expect(localStorage.getItem('habit-tracker:v1')).toBe(original)
})
