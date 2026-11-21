import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 390, height: 844 } })

test('badges show conditions and persist through a gap without changing existing habits and logs', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-06-20T03:00:00Z') })
  await page.addInitScript(() => {
    if (localStorage.getItem('habit-tracker:v1')) return
    localStorage.setItem('habit-tracker:v1', JSON.stringify({
      habits: [{ id: 'reading', name: '読書', order: 0, createdAt: '2026-06-01T00:00:00Z' }],
      logs: Array.from({ length: 7 }, (_, i) => ({ habitId: 'reading', date: `2026-06-0${i + 1}`, done: true })),
    }))
    localStorage.setItem('habit-tracker:study-time:v1', JSON.stringify({ '2026-06-01': { shadoten: 600 } }))
  })
  await page.goto('./')
  const view = page.getByRole('region', { name: '実績バッジ' })
  await view.getByText(/バッジを見る/).click()
  await expect(view.locator('li[data-earned="true"]')).toHaveCount(2)
  await expect(view.locator('li[data-earned="false"]')).toHaveCount(7)
  await expect(view).toContainText('累計記録日数 7日')
  await expect(view).toContainText('自己ベスト更新 20回')
  await expect(view).toContainText('英語の累計時間 100時間')
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('habit-tracker:badges:v1')!))).toEqual(['days-7', 'english-10'])
  await expect(page.getByRole('region', { name: '今日の記録' })).toContainText('0日連続')
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('habit-tracker:v1')!))
  expect(stored.logs).toHaveLength(7)
  expect(stored.habits[0].name).toBe('読書')
  if (process.env.BADGE_SCREENSHOTS) {
    await view.scrollIntoViewIfNeeded()
    await page.screenshot({ path: '/home/ubuntu/screens/badges-normal.png' })
  }
  await page.reload()
  await view.getByText(/バッジを見る/).click()
  await expect(view.locator('li[data-earned="true"]')).toHaveCount(2)
})

test('demo shows fake earned and locked badges without reading or writing storage', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('demo must not read storage') }
    Storage.prototype.setItem = () => { throw new Error('demo must not write storage') }
  })
  await page.goto('./?demo=1')
  const view = page.getByRole('region', { name: '実績バッジ' })
  await view.getByText(/バッジを見る/).click()
  await expect(view.locator('li[data-earned="true"]').first()).toBeVisible()
  await expect(view.locator('li[data-earned="false"]').first()).toBeVisible()
  await expect(view.getByRole('alert')).toHaveCount(0)
  if (process.env.BADGE_SCREENSHOTS) {
    await view.scrollIntoViewIfNeeded()
    await page.screenshot({ path: '/home/ubuntu/screens/badges-demo.png' })
  }
})

test('empty and unreadable badge data are not shown as earned', async ({ page }) => {
  await page.goto('./')
  const view = page.getByRole('region', { name: '実績バッジ' })
  await view.getByText(/バッジを見る/).click()
  await expect(view.locator('li[data-earned="true"]')).toHaveCount(0)
  await page.evaluate(() => localStorage.setItem('habit-tracker:badges:v1', '{'))
  await page.reload()
  await expect(view.getByRole('alert')).toContainText('実績を読み込めませんでした')
  expect(await page.evaluate(() => localStorage.getItem('habit-tracker:badges:v1'))).toBe('{')
})
