import { expect, test } from '@playwright/test'

test.use({ timezoneId: 'America/Los_Angeles' })

test('端末が米国時間でもJSTの午前0時に日付と記録が切り替わる', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T14:59:58Z') })
  await page.clock.pauseAt(new Date('2026-01-01T14:59:59Z'))
  await page.goto('./')
  expect(await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone)).toBe('America/Los_Angeles')
  await expect(page.getByTestId('today-date')).toContainText('2026.01.01')
  const card = page.getByTestId('habit-item').first()
  await card.getByTestId('checkin-toggle').click()
  await expect(card.getByTestId('checkin-toggle')).toHaveAttribute('aria-pressed', 'true')
  await page.clock.fastForward(2000)
  await expect(page.getByTestId('today-date')).toContainText('2026.01.02')
  await expect(card.getByTestId('checkin-toggle')).toHaveAttribute('aria-pressed', 'false')
  await expect(card.getByTestId('streak-count')).toHaveText('1日連続')
  await card.getByTestId('checkin-toggle').click()
  await expect(card.getByTestId('streak-count')).toHaveText('2日連続')
  const dates = await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('habit-tracker:v1')!) as { logs: { date: string }[] }
    return data.logs.map((log) => log.date).sort()
  })
  expect(dates).toEqual(['2026-01-01', '2026-01-02'])
  await page.reload()
  await expect(card.getByTestId('streak-count')).toHaveText('2日連続')
})

test('昨日の記録を日本時間で切り替え、数値なしと未記録を区別する', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T14:59:58Z') })
  await page.clock.pauseAt(new Date('2026-01-01T14:59:59Z'))
  const habits = [
    { id: 'english', name: '英語トレーニング', unit: '分' },
    { id: 'workout', name: '筋トレ', unit: '回' },
    { id: 'reading', name: '読書', unit: 'ページ' },
  ].map((habit, order) => ({ ...habit, order, createdAt: '2025-12-31T00:00:00Z' }))
  const legacy = JSON.stringify({
    habits,
    logs: [
      { habitId: 'english', date: '2026-01-01', done: true, value: 40 },
      { habitId: 'workout', date: '2026-01-01', done: true },
      { habitId: 'reading', date: '2026-01-01', done: false },
      { habitId: 'reading', date: '2026-01-02', done: true, value: 12 },
    ],
  })
  const study = JSON.stringify({ '2026-01-01': { shadoten: 25, spiful: 0 }, '2026-01-02': { shadoten: 15 } })
  await page.addInitScript(({ legacy, study }) => {
    localStorage.setItem('habit-tracker:v1', legacy)
    localStorage.setItem('habit-tracker:study-time:v1', study)
  }, { legacy, study })
  await page.goto('./')

  await page.getByRole('button', { name: '昨日の記録', exact: true }).tap()
  const yesterday = page.getByRole('region', { name: '昨日の記録' })
  await expect(yesterday).toContainText('2025.12.31')
  await expect(yesterday.getByText('昨日の記録はありません。')).toBeVisible()

  await page.clock.fastForward(2000)
  await expect(yesterday).toContainText('2026.01.01')
  await expect(yesterday.getByText('昨日の記録はありません。')).toHaveCount(0)
  await expect(yesterday.getByText('英語トレーニング').locator('..')).toHaveText('英語トレーニング40 分')
  await expect(yesterday.getByText('筋トレ').locator('..')).toHaveText('筋トレ記録済み（数値なし）')
  await expect(yesterday.getByText('シャドテン').locator('..')).toHaveText('シャドテン25 分')
  await expect(yesterday.getByText('スピフル').locator('..')).toHaveText('スピフル0 分')
  await expect(yesterday.getByText('読書')).toHaveCount(0)
  await expect(page.getByRole('spinbutton')).toHaveCount(0)
  expect(await page.evaluate(() => [
    localStorage.getItem('habit-tracker:v1'),
    localStorage.getItem('habit-tracker:study-time:v1'),
  ])).toEqual([legacy, study])

  await yesterday.getByRole('button', { name: '今日の入力へ戻る' }).tap()
  await expect(page.getByRole('spinbutton', { name: 'シャドテン（分）' })).toHaveValue('15')
})
