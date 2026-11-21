import { expect, test } from '@playwright/test'

const seed = (lastDate: string) => {
  if (localStorage.getItem('habit-tracker:v1')) return
  localStorage.setItem('habit-tracker:v1', JSON.stringify({
    habits: [{ id: 'reading', name: '読書', unit: 'ページ', order: 0, createdAt: '2026-06-01T00:00:00Z' }],
    logs: [{ habitId: 'reading', date: lastDate, done: true }],
  }))
  localStorage.setItem('habit-tracker:study-time:v1', JSON.stringify({ [lastDate]: { shadoten: 20 } }))
  localStorage.setItem('habit-tracker:body:v1', JSON.stringify({ measurements: [{ id: 'm', date: '2026-06-07', weightKg: 70, createdAt: '2026-06-07T00:00:00Z' }] }))
  localStorage.setItem('habit-tracker:xp:v1', JSON.stringify({ totalXp: 10, awarded: { [`study:${lastDate}:shadoten`]: 10 } }))
}

test('resuming the day after the first missed day earns a one-time comeback bonus', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-06-08T03:00:00Z') })
  await page.addInitScript(seed, '2026-06-06')
  await page.goto('./')
  const summary = page.getByRole('region', { name: '今日の記録' })
  const xp = page.getByRole('region', { name: 'レベルとXP' })
  await expect(page.getByRole('region', { name: '積み上げた成果' })).toContainText('復帰ボーナス +30 XP がもらえます')
  await expect(xp).toContainText('累計 15 XP')
  if (process.env.COMEBACK_SCREENSHOTS) await page.screenshot({ path: '/home/ubuntu/screenshots/comeback-before.png', fullPage: true })
  await page.getByTestId('habit-item').first().getByTestId('checkin-toggle').tap()
  await expect(summary).toContainText('おかえりなさい！また始めてくれてうれしいです。')
  await expect(xp).toContainText('累計 45 XP')
  await page.getByLabel('シャドテン（分）').fill('15')
  await page.getByRole('button', { name: 'シャドテンを保存' }).tap()
  await expect(xp).toContainText('累計 55 XP')
  await page.reload()
  await expect(xp).toContainText('累計 55 XP')
  await expect(summary).toContainText('復帰ボーナス +30 XP')
  await page.evaluate(() => window.scrollTo(0, 0))
  if (process.env.COMEBACK_SCREENSHOTS) await page.screenshot({ path: '/home/ubuntu/screenshots/comeback-after.png', fullPage: true })
})

test('resuming later than that, or with only a body measurement in between, earns no bonus', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-06-08T03:00:00Z') })
  await page.addInitScript(seed, '2026-06-05')
  await page.goto('./')
  const xp = page.getByRole('region', { name: 'レベルとXP' })
  await expect(page.getByRole('region', { name: '積み上げた成果' })).not.toContainText('復帰ボーナス')
  await page.getByTestId('habit-item').first().getByTestId('checkin-toggle').tap()
  await expect(page.getByTestId('habit-item').first().getByTestId('streak-count')).toHaveText('1日連続')
  await expect(xp).toContainText('累計 15 XP')
  await expect(page.getByRole('region', { name: '今日の記録' })).not.toContainText('復帰ボーナス')
})
