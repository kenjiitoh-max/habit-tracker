import { expect, test } from '@playwright/test'

test.use({ timezoneId: 'America/Los_Angeles' })

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date('2026-02-28T15:05:00Z') })
})

test('日本時間の日・週・月ごとに集計し、旧記録と未記録と0分を区別する', async ({ page }) => {
  const study = JSON.stringify({
    '2026-02-20': { spiful: 10 },
    '2026-02-22': { shadoten: 20 },
    '2026-02-23': { shadoten: 15 },
    '2026-03-01': { shadoten: 0, spiful: 5 },
  })
  const legacy = JSON.stringify({
    habits: [{ id: 'old', name: '英語トレーニング', unit: '分', createdAt: '2026-02-01T00:00:00Z', order: 0 }],
    logs: [{ habitId: 'old', date: '2026-02-24', done: true, value: 30 }],
  })
  await page.addInitScript(({ study, legacy }) => {
    localStorage.setItem('habit-tracker:study-time:v1', study)
    localStorage.setItem('habit-tracker:v1', legacy)
  }, { study, legacy })
  await page.goto('./')
  await page.getByRole('button', { name: 'グラフ' }).tap()
  const stats = page.getByRole('region', { name: '英語の学習時間' })
  await expect(stats.getByRole('img')).toHaveAccessibleName('全体の日別学習時間')
  await expect(stats.getByText('今日の合計').locator('..')).toContainText('5 分')
  await expect(stats.getByText('累計（今日まで）').locator('..')).toContainText('50 分')
  await stats.getByText('日別の学習データを見る').tap()
  await expect(stats.getByRole('row', { name: '2026-02-24 未記録 30 分' })).toBeVisible()

  await stats.getByRole('button', { name: 'シャドテン' }).tap()
  await expect(stats.getByText('今日の合計').locator('..')).toContainText('0 分')
  await expect(stats.getByRole('row', { name: '2026-03-01 0 分' })).toBeVisible()
  await expect(stats.getByText('旧記録（内訳不明・合計に含めない）')).toHaveCount(0)
  await stats.getByRole('button', { name: '週別' }).tap()
  await expect(stats.getByText('2026-02-23 〜 2026-03-01（月曜始まり）')).toBeVisible()
  await expect(stats.getByText('今週の合計').locator('..')).toContainText('15 分')

  await stats.getByRole('button', { name: 'スピフル' }).tap()
  await stats.getByRole('button', { name: '月別' }).tap()
  await expect(stats.getByRole('img')).toHaveAccessibleName('スピフルの月別学習時間')
  await expect(stats.getByText('今月の合計').locator('..')).toContainText('5 分')
  await expect(stats.getByRole('row', { name: '2026-02-01 〜 2026-02-28 10 分' })).toBeVisible()
  const [storedStudy, storedLegacy] = await page.evaluate(() => [
    localStorage.getItem('habit-tracker:study-time:v1'),
    localStorage.getItem('habit-tracker:v1'),
  ])
  expect(storedStudy).toBe(study)
  const { habits, logs } = JSON.parse(storedLegacy!)
  expect({ habits, logs }).toEqual(JSON.parse(legacy))
})

test('デモの集計は実データを読まず、サンプルへの変更だけを反映する', async ({ page }) => {
  await page.addInitScript(() => {
    for (const method of ['getItem', 'setItem', 'removeItem'] as const) {
      const original = Storage.prototype[method]
      Storage.prototype[method] = function (key: string, ...args: string[]) {
        if (key === 'habit-tracker:study-time:v1' || key === 'habit-tracker:v1') {
          throw new Error('デモでは実データにアクセスしない')
        }
        return Reflect.apply(original, this, [key, ...args])
      }
    }
  })
  await page.goto('./?demo=1')
  const stats = page.getByRole('region', { name: '英語の学習時間' })
  await page.getByRole('button', { name: 'グラフ' }).tap()
  await expect(stats.getByText('今日の合計').locator('..')).toContainText('30 分')
  await page.getByRole('button', { name: '記録', exact: true }).tap()
  await page.getByRole('spinbutton', { name: 'シャドテン（分）' }).fill('2')
  await page.getByRole('button', { name: 'シャドテンを保存' }).tap()
  await page.getByRole('button', { name: 'グラフ' }).tap()
  await expect(stats.getByText('今日の合計').locator('..')).toContainText('12 分')
  await page.reload()
  await page.getByRole('button', { name: 'グラフ' }).tap()
  await expect(stats.getByText('今日の合計').locator('..')).toContainText('30 分')
})
