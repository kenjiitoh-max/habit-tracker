import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-02T03:00:00Z') })
})

test('体重・体脂肪率を別々に記録・修正でき、ホームや習慣には出ない', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByTestId('habit-item')).toHaveCount(2)
  const habits = await page.evaluate(() => localStorage.getItem('habit-tracker:v1'))
  await page.getByTestId('nav-body').click()
  await expect(page.getByTestId('body-empty')).toBeVisible()
  await page.getByTestId('body-weight-input').fill('68.4')
  await page.getByTestId('body-save-button').click()
  await expect(page.getByTestId('body-item')).toHaveText(/2026\.01\.02\s*68\.4 kg ／ —/)
  await page.getByTestId('body-date-input').fill('2026-01-01')
  await page.getByTestId('body-fat-input').fill('18.3')
  await page.getByTestId('body-save-button').click()
  await expect(page.getByTestId('body-item')).toHaveCount(2)
  await page.reload()
  await expect(page.getByTestId('habit-item')).toHaveCount(2)
  await expect(page.getByText('68.4')).toHaveCount(0)
  await expect(page.getByTestId('streak-count').first()).toHaveText('0日連続')
  await page.getByTestId('nav-body').click()
  await page.getByRole('button', { name: '2026.01.02の記録を修正' }).click()
  await expect(page.getByTestId('body-weight-input')).toHaveValue('68.4')
  await page.getByTestId('body-weight-input').fill('68.1')
  await page.getByTestId('body-fat-input').fill('17.9')
  await page.getByRole('button', { name: '記録を修正する' }).click()
  await expect(page.getByTestId('body-item').first()).toContainText('68.1 kg ／ 17.9%')
  await expect(page.getByTestId('body-item').last()).toContainText('— ／ 18.3%')
  expect(await page.evaluate(() => localStorage.getItem('habit-tracker:v1'))).toBe(habits)
})

test('デモでは架空の測定値だけを使い、実データに触れない', async ({ page }) => {
  await page.goto('./')
  await page.getByTestId('nav-body').click()
  await page.getByTestId('body-weight-input').fill('77.7')
  await page.getByTestId('body-save-button').click()
  await expect(page.getByTestId('body-item')).toHaveCount(1)
  const original = await page.evaluate(() => localStorage.getItem('habit-tracker:body:v1'))
  await page.addInitScript(() => {
    const get = Storage.prototype.getItem
    const set = Storage.prototype.setItem
    Storage.prototype.getItem = function (key) {
      if (key.startsWith('habit-tracker:')) throw new Error('デモが実データを読みました')
      return get.call(this, key)
    }
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('habit-tracker:')) throw new Error('デモが実データを書きました')
      return set.call(this, key, value)
    }
  })
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('./?demo=1')
  await page.getByTestId('nav-body').click()
  await expect(page.getByText('77.7')).toHaveCount(0)
  await expect(page.getByRole('img', { name: '体重の推移' })).toBeVisible()
  await expect(page.getByRole('img', { name: '体脂肪率の推移' })).toBeVisible()
  expect(await page.getByTestId('body-item').count()).toBeGreaterThan(30)
  await page.getByTestId('body-weight-input').fill('90')
  await page.getByTestId('body-save-button').click()
  await expect(page.getByTestId('body-item').first()).toContainText('90 kg')
  await page.reload()
  await page.getByTestId('nav-body').click()
  await expect(page.getByTestId('body-item').first()).not.toContainText('90 kg')
  expect(errors).toEqual([])
  const stored = await page.context().storageState()
  expect(stored.origins.flatMap((origin) => origin.localStorage).find((item) => item.name === 'habit-tracker:body:v1')?.value).toBe(original)
})

test('体の記録に指標別の実測値と移動平均を表示し、観測のない区間で線を切る', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('habit-tracker:body:v1', JSON.stringify({ measurements: [
      { date: '2025-12-20', weightKg: 70, bodyFatPercent: 20 },
      { date: '2025-12-22', bodyFatPercent: 19 },
      { date: '2026-01-02', weightKg: 68 },
    ] }))
  })
  await page.goto('./')
  await page.getByTestId('nav-body').click()
  const weight = page.getByRole('img', { name: '体重の推移' })
  const fat = page.getByRole('img', { name: '体脂肪率の推移' })
  await expect(weight.locator('circle')).toHaveCount(2)
  await expect(fat.locator('circle')).toHaveCount(2)
  await expect(weight.locator('path')).toHaveAttribute('d', /^M.*L.* M[^LM]+$/)
  await expect(weight.locator('rect')).toHaveCount(1)
  await expect(fat.locator('path')).toHaveAttribute('d', /^M[^M]+$/)

  await page.getByRole('button', { name: '2025.12.20の記録を削除' }).click()
  await expect(weight.locator('circle')).toHaveCount(1)
  await expect(fat.locator('circle')).toHaveCount(1)
  await page.getByRole('button', { name: '2025.12.22の記録を削除' }).click()
  await expect(fat).toHaveCount(0)
  await expect(page.getByText('体脂肪率の記録はまだありません。')).toBeVisible()
})
