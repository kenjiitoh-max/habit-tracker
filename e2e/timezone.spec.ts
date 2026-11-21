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
