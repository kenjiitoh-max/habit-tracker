import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-02T03:00:00Z') })
})

test('週間・月間グラフを切り替えて習慣ごとの達成率を表示する', async ({ page }) => {
  await page.goto('./?demo=1')
  await page.getByTestId('nav-stats').click()
  await expect(page.getByTestId('stats-view')).toBeVisible()
  await expect(page.getByTestId('stats-period-week')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('stats-chart')).toHaveAccessibleName('直近7日間の日別達成率')
  await expect(page.getByTestId('habit-rate')).toHaveCount(4)
  await page.getByTestId('stats-period-month').click()
  await expect(page.getByTestId('stats-period-month')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('stats-period-week')).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByTestId('stats-chart')).toHaveAccessibleName('直近30日間の日別達成率')
  await expect(page.getByTestId('habit-rate').first()).toContainText('83%')
  await page.getByTestId('stats-period-week').click()
  await expect(page.getByTestId('stats-chart')).toHaveAccessibleName('直近7日間の日別達成率')
})

test('デモは実データに触れず、タブ間で維持され、再読み込みで変更が戻る', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByTestId('habit-item')).toHaveCount(2)
  const original = await page.evaluate(() => localStorage.getItem('habit-tracker:v1'))
  await page.addInitScript(() => {
    const get = Storage.prototype.getItem
    const set = Storage.prototype.setItem
    const remove = Storage.prototype.removeItem
    Storage.prototype.getItem = function (key) {
      if (key === 'habit-tracker:v1') throw new Error('デモが実データを読みました')
      return get.call(this, key)
    }
    Storage.prototype.setItem = function (key, value) {
      if (key === 'habit-tracker:v1') throw new Error('デモが実データを書きました')
      return set.call(this, key, value)
    }
    Storage.prototype.removeItem = function (key) {
      if (key === 'habit-tracker:v1') throw new Error('デモが実データを削除しました')
      return remove.call(this, key)
    }
    Storage.prototype.clear = function () { throw new Error('デモが保存データを消しました') }
  })
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('./?demo=1')
  await expect(page.getByTestId('demo-banner')).toBeVisible()
  await expect(page.getByTestId('habit-item')).toHaveCount(4)
  await expect(page.getByTestId('habit-item').nth(1)).toContainText('英語リスニング')
  await expect(page.getByTestId('streak-count').first()).toHaveText('4日連続')
  await page.getByTestId('habit-item').first().getByTestId('edit-habit-button').click()
  await page.getByTestId('habit-name-input').fill('デモで変更')
  await page.getByTestId('save-habit-button').click()
  await expect(page.getByTestId('habit-item').first()).toContainText('デモで変更')
  await page.getByTestId('nav-stats').click()
  await expect(page.getByTestId('stats-view')).toBeVisible()
  await expect(page).toHaveURL(/\?demo=1$/)
  await page.getByTestId('nav-record').click()
  await expect(page.getByTestId('habit-item').first()).toContainText('デモで変更')
  await page.reload()
  await expect(page.getByTestId('habit-item').first()).toContainText('筋トレ')
  expect(errors).toEqual([])
  const stored = await page.context().storageState()
  expect(stored.origins.flatMap((origin) => origin.localStorage).find((item) => item.name === 'habit-tracker:v1')?.value).toBe(original)
})
