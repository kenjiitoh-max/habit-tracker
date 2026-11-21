import { expect, test } from '@playwright/test'

test('study XP survives editing and reload and levels up at 100', async ({ page }) => {
  await page.goto('./')
  const card = page.getByRole('region', { name: 'レベルとXP' })
  await expect(card).toContainText('累計 0 XP')
  const minutes = page.getByRole('spinbutton', { name: 'シャドテン（分）' })
  await minutes.fill('15')
  await page.getByRole('button', { name: 'シャドテンを保存' }).tap()
  await expect(card).toContainText('累計 10 XP')
  await minutes.fill('30')
  await page.getByRole('button', { name: 'シャドテンを保存' }).tap()
  await page.reload()
  await expect(card).toContainText('累計 10 XP')
  await page.evaluate(() => {
    const days = JSON.parse(localStorage.getItem('habit-tracker:study-time:v1')!)
    for (let day = 1; day <= 8; day++) days[`2020-01-0${day}`] = { shadoten: 10 }
    localStorage.setItem('habit-tracker:study-time:v1', JSON.stringify(days))
  })
  await page.reload()
  await expect(card).toContainText('累計 90 XP')
  await expect(card).toContainText('レベル 1')
  await page.getByRole('spinbutton', { name: 'スピフル（分）' }).fill('10')
  await page.getByRole('button', { name: 'スピフルを保存' }).tap()
  await expect(card).toContainText('レベル 2')
  await expect(card).toContainText('累計 100 XP')
  await expect(card.getByRole('progressbar')).toHaveAttribute('value', '0')
  await expect(card).toContainText('あと 100 XP で次のレベル')
})
