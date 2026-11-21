import { expect, test } from '@playwright/test'

test.use({ reducedMotion: 'reduce' })

test('a 7-day streak shows a flame, celebrates once, and stays clear with reduced motion', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-06-07T03:00:00Z') })
  await page.addInitScript(() => {
    if (localStorage.getItem('habit-tracker:study-time:v1')) return
    const days: Record<string, { shadoten: number }> = {}
    for (let day = 1; day <= 6; day++) days[`2026-06-0${day}`] = { shadoten: 15 }
    localStorage.setItem('habit-tracker:study-time:v1', JSON.stringify(days))
  })
  await page.goto('./')
  const streak = page.getByTestId('summary-streak')
  await expect(streak).toContainText('6日連続')
  await expect(streak).toContainText('次の節目 7日まであと1日')
  await expect(page.getByRole('status', { name: 'ストリークの節目' })).toHaveCount(0)
  const section = page.getByRole('region', { name: '今日の英語学習' })
  await section.getByRole('spinbutton', { name: 'シャドテン（分）' }).fill('20')
  await section.getByRole('button', { name: 'シャドテンを保存' }).tap()
  const celebration = page.getByRole('status', { name: 'ストリークの節目' })
  await expect(celebration).toContainText('7日連続、達成！')
  await expect(celebration).toHaveCSS('animation-name', 'none')
  await expect(streak).toContainText('節目 7日 達成')
  if (process.env.STREAK_SCREENSHOTS) await page.screenshot({ path: '/home/ubuntu/screenshots/streak-milestone.png' })
  await page.reload()
  await expect(streak).toContainText('7日連続')
  await expect(streak).toContainText('次の節目 30日まであと23日')
  await expect(page.getByRole('status', { name: 'ストリークの節目' })).toHaveCount(0)
  if (process.env.STREAK_SCREENSHOTS) await page.screenshot({ path: '/home/ubuntu/screenshots/streak-after-reload.png' })
})
