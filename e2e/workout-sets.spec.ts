import { expect, test } from '@playwright/test'

test('今日の種目ごとにセットを保存・修正でき、昨日の振り返りで確認できる。従来の筋トレ（回）は残る', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T12:00:00Z') })
  const legacy = JSON.stringify({
    habits: [{ id: 'legacy-workout', name: '筋トレ', unit: '回', createdAt: '2025-12-31T00:00:00Z', order: 0 }],
    logs: [{ habitId: 'legacy-workout', date: '2026-01-01', done: true, value: 30 }],
  })
  await page.addInitScript((data) => {
    if (localStorage.getItem('habit-tracker:v1') === null) localStorage.setItem('habit-tracker:v1', data)
  }, legacy)
  await page.goto('./')

  const section = page.getByRole('region', { name: '今日の筋トレ' })
  const add = section.getByRole('button', { name: '＋ セットを追加' })
  await section.getByLabel('種目').selectOption({ label: 'ベンチプレス' })
  await section.getByLabel('重量（kg）').fill('60')
  await section.getByLabel('回数').fill('10')
  await add.tap()
  await section.getByLabel('回数').fill('8')
  await add.tap()
  await section.getByLabel('種目').selectOption({ label: '懸垂' })
  await expect(section.getByLabel('重量（kg）')).toHaveCount(0)
  await section.getByLabel('回数').fill('12')
  await add.tap()

  await page.reload()
  const bench = section.getByRole('list', { name: 'ベンチプレスのセット' })
  await expect(bench.getByRole('listitem')).toHaveText([/1セット目60 kg × 10回/, /2セット目60 kg × 8回/])
  await expect(section.getByRole('list', { name: '懸垂のセット' })).toContainText('12回')
  await section.getByRole('button', { name: 'ベンチプレス 2セット目を編集' }).tap()
  const edit = section.getByRole('form', { name: 'ベンチプレス 2セット目を編集' })
  await edit.getByLabel('重量（kg）').fill('62.5')
  await edit.getByRole('button', { name: '保存' }).tap()
  await page.reload()
  await expect(bench.getByRole('listitem').nth(1)).toContainText('62.5 kg × 8回')
  await expect(page.getByRole('spinbutton', { name: '筋トレの今日の数値（回）' })).toHaveValue('30')
  const stored = JSON.parse((await page.evaluate(() => localStorage.getItem('habit-tracker:v1')))!)
  const { habits, logs } = JSON.parse(legacy)
  expect({ habits: stored.habits, logs: stored.logs }).toEqual({ habits, logs })

  await page.clock.fastForward('24:00:00')
  await page.getByRole('button', { name: '昨日の記録' }).tap()
  await expect(page.getByText('ベンチプレス').locator('+ dd')).toHaveText('60 kg × 10回 / 62.5 kg × 8回')
  await expect(page.getByText('懸垂').locator('+ dd')).toHaveText('12回')
})
