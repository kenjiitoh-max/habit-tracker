import { expect, test } from '@playwright/test'

test('a gap preserves achievements and per-habit streaks, then welcomes recording again', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-06-08T03:00:00Z') })
  await page.addInitScript(() => {
    localStorage.setItem('habit-tracker:v1', JSON.stringify({
      habits: [{ id: 'reading', name: '読書', unit: 'ページ', order: 0, createdAt: '2026-06-01T00:00:00Z' }],
      logs: ['2026-06-01', '2026-06-02', '2026-06-03'].map((date) => ({ habitId: 'reading', date, done: true, value: 10 })),
    }))
    localStorage.setItem('habit-tracker:study-time:v1', JSON.stringify({ '2026-06-02': { shadoten: 20 }, '2026-06-03': { spiful: 15 } }))
    localStorage.setItem('habit-tracker:workout-sets:v1', JSON.stringify({ sets: [
      { id: 'first', exerciseId: 'preset-chest-bench-press', date: '2026-06-01', createdAt: '2026-06-01T10:00:00Z', reps: 8, weightKg: 40 },
      { id: 'second', exerciseId: 'preset-chest-bench-press', date: '2026-06-03', createdAt: '2026-06-03T10:00:00Z', reps: 10, weightKg: 45 },
    ] }))
    localStorage.setItem('habit-tracker:xp:v1', JSON.stringify({ totalXp: 240, awarded: {} }))
  })
  await page.goto('./')
  const summary = page.getByRole('region', { name: '今日の記録' })
  const card = page.getByRole('region', { name: '積み上げた成果' })
  await expect(summary).toContainText('0日連続')
  await expect(card).toContainText('累計記録日数 3日')
  await expect(card).toContainText('レベル Lv.3')
  await expect(card).toContainText('自己ベスト更新 3回')
  await expect(card).toContainText('最長ストリーク 3日')
  await expect(card).toContainText('2026-06-01〜2026-06-03')
  const habit = page.getByTestId('habit-item').first()
  await expect(habit.getByTestId('streak-count')).toHaveText('0日連続')
  if (process.env.STREAK_SCREENSHOTS) await page.screenshot({ path: '/home/ubuntu/screenshots/streak-break.png', fullPage: true })
  await habit.getByTestId('checkin-toggle').tap()
  await expect(card).toHaveCount(0)
  await expect(summary).toContainText('1日連続')
  await expect(habit.getByTestId('streak-count')).toHaveText('1日連続')
  await page.evaluate(() => window.scrollTo(0, 0))
  if (process.env.STREAK_SCREENSHOTS) await page.screenshot({ path: '/home/ubuntu/screenshots/streak-normal.png', fullPage: true })
})
