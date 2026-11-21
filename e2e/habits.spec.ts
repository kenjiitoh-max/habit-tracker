import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-02T03:00:00Z') })
})

test('習慣を追加・編集し、確認して削除できる', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByTestId('habit-item')).toHaveCount(2)
  await page.getByTestId('add-habit-button').click()
  await expect(page.getByTestId('save-habit-button')).toBeDisabled()
  await page.getByTestId('habit-name-input').fill('ウォーキング')
  await page.getByTestId('habit-unit-input').fill('分')
  await page.getByTestId('save-habit-button').click()
  await expect(page.getByTestId('habit-item')).toHaveCount(3)
  const added = page.getByTestId('habit-item').last()
  await expect(added).toContainText('ウォーキング')
  await added.getByTestId('edit-habit-button').click()
  await expect(page.getByTestId('habit-name-input')).toHaveValue('ウォーキング')
  await page.getByTestId('habit-name-input').fill('散歩')
  await page.getByTestId('habit-unit-input').fill('歩')
  await page.getByTestId('save-habit-button').click()
  await expect(added).toContainText('散歩')
  await expect(added).toContainText('単位：歩')
  await page.reload()
  await expect(added).toContainText('散歩')
  await added.getByTestId('delete-habit-button').click()
  await expect(page.getByTestId('habit-dialog')).toBeVisible()
  await expect(page.getByTestId('habit-item')).toHaveCount(3)
  await page.getByTestId('confirm-delete-button').click()
  await expect(page.getByTestId('habit-item')).toHaveCount(2)
  await page.reload()
  await expect(page.getByTestId('habit-item')).toHaveCount(2)
})

test('数値と達成チェックが再読み込み後も保存される', async ({ page }) => {
  await page.goto('./')
  const card = page.getByTestId('habit-item').first()
  await expect(card.getByTestId('checkin-toggle')).toHaveAttribute('aria-pressed', 'false')
  await card.getByTestId('checkin-value-input').fill('30')
  await card.getByTestId('checkin-toggle').click()
  await expect(card.getByTestId('checkin-toggle')).toHaveAttribute('aria-pressed', 'true')
  await page.reload()
  await expect(card.getByTestId('checkin-value-input')).toHaveValue('30')
  await expect(card.getByTestId('streak-count')).toHaveText('1日連続')
  await card.getByTestId('checkin-value-input').fill('45')
  await card.getByTestId('checkin-value-input').press('Enter')
  await page.reload()
  await expect(card.getByTestId('checkin-value-input')).toHaveValue('45')
  await card.getByTestId('checkin-toggle').click()
  await page.reload()
  await expect(card.getByTestId('checkin-toggle')).toHaveAttribute('aria-pressed', 'false')
  await expect(card.getByTestId('checkin-value-input')).toHaveValue('')
})

test('今日が未達成でも昨日までのストリークを表示する', async ({ page }) => {
  await page.addInitScript(() => {
    if (localStorage.getItem('habit-tracker:v1') !== null) return
    localStorage.setItem('habit-tracker:v1', JSON.stringify({
      habits: [{ id: 'seed', name: '筋トレ', unit: '回', createdAt: '2025-12-01T00:00:00+09:00', order: 0 }],
      logs: ['2025-12-31', '2026-01-01'].map((date) => ({ habitId: 'seed', date, done: true })),
    }))
  })
  await page.goto('./')
  const card = page.getByTestId('habit-item').first()
  await expect(card.getByTestId('streak-count')).toHaveText('2日連続')
  await card.getByTestId('checkin-toggle').click()
  await expect(card.getByTestId('streak-count')).toHaveText('3日連続')
  await page.reload()
  await expect(card.getByTestId('streak-count')).toHaveText('3日連続')
})
