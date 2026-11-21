import { expect, test } from '@playwright/test'

test('今日の学習時間をサービス別に保存・修正でき、既存の英語記録はそのまま残る', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T14:59:58Z') })
  await page.clock.pauseAt(new Date('2026-01-01T14:59:59Z'))
  const legacy = JSON.stringify({
    habits: [{ id: 'legacy-english', name: '英語トレーニング', unit: '分', createdAt: '2025-12-31T00:00:00Z', order: 0 }],
    logs: [
      { habitId: 'legacy-english', date: '2025-12-31', done: true, value: 25 },
      { habitId: 'legacy-english', date: '2026-01-01', done: true, value: 45 },
    ],
  })
  await page.addInitScript((data) => {
    if (localStorage.getItem('habit-tracker:v1') === null) localStorage.setItem('habit-tracker:v1', data)
  }, legacy)
  await page.goto('./')

  const section = page.getByRole('region', { name: '今日の英語学習' })
  const shadoten = section.getByRole('spinbutton', { name: 'シャドテン（分）' })
  const spiful = section.getByRole('spinbutton', { name: 'スピフル（分）' })
  await expect(shadoten).toHaveValue('')
  await expect(spiful).toHaveValue('')
  await expect(page.getByRole('spinbutton', { name: '英語トレーニングの今日の数値（分）' })).toHaveValue('45')

  await shadoten.fill('15')
  await section.getByRole('button', { name: 'シャドテンを保存' }).tap()
  await expect(spiful).toHaveValue('')
  await spiful.fill('10')
  await section.getByRole('button', { name: 'スピフルを保存' }).tap()
  await page.reload()
  await expect(shadoten).toHaveValue('15')
  await expect(spiful).toHaveValue('10')

  await shadoten.fill('0')
  await section.getByRole('button', { name: 'シャドテンを保存' }).tap()
  await page.reload()
  await expect(shadoten).toHaveValue('0')
  await expect(spiful).toHaveValue('10')
  const stored = JSON.parse((await page.evaluate(() => localStorage.getItem('habit-tracker:v1')))!)
  const { habits, logs } = JSON.parse(legacy)
  expect({ habits: stored.habits, logs: stored.logs }).toEqual({ habits, logs })

  await page.clock.fastForward(2000)
  await expect(shadoten).toHaveValue('')
  await expect(spiful).toHaveValue('')
})
