import { performance } from 'node:perf_hooks'
import { expect, test } from '@playwright/test'
import type { Locator, Page } from '@playwright/test'

test.use({ viewport: { width: 390, height: 844 } })

async function reachableTarget(target: Locator) {
  await target.scrollIntoViewIfNeeded()
  const box = await target.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.width).toBeGreaterThanOrEqual(44)
  expect(box!.height).toBeGreaterThanOrEqual(44)
}

async function screenshot(page: Page, name: string) {
  if (process.env.SCREENSHOT_DIR) {
    await page.screenshot({ path: `${process.env.SCREENSHOT_DIR}/${name}.png`, scale: 'css',
      style: '* { -webkit-tap-highlight-color: transparent; }' })
  }
}

test('筋トレ：起動から前回と同じ記録まで30秒以内（種目選択2タップ＋保存1タップ）', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('habit-tracker:workout-sets:v1', JSON.stringify({ sets: [
      { id: 'previous', date: '2025-01-01', exerciseId: 'preset-chest-bench-press', weightKg: 62.5, reps: 8, createdAt: '2025-01-01T12:00:00Z' },
    ] }))
  })
  const start = performance.now()
  await page.goto('./')
  const section = page.getByRole('region', { name: '今日の筋トレ' })
  const select = section.getByLabel('種目')
  await reachableTarget(select)
  await select.selectOption({ label: 'ベンチプレス' })
  await expect(section.getByLabel('重量（kg）')).toHaveValue('62.5')
  await expect(section.getByLabel('回数')).toHaveValue('8')
  const repeat = section.getByRole('button', { name: '前回と同じ' })
  await reachableTarget(repeat)
  await repeat.tap()
  await expect(section.getByRole('list', { name: 'ベンチプレスのセット' })).toContainText('62.5 kg × 8回')
  const elapsed = performance.now() - start
  console.log(`筋トレ: ${(elapsed / 1000).toFixed(2)}秒 / 3タップ相当（選択2＋保存1）、操作対象44px以上`)
  expect(elapsed).toBeLessThan(30_000)
  await select.scrollIntoViewIfNeeded()
  await screenshot(page, 'workout-previous')
})

test('英語：起動からシャドテン保存まで30秒以内（入力＋保存の2タップと数値入力）', async ({ page }) => {
  const start = performance.now()
  await page.goto('./')
  const section = page.getByRole('region', { name: '今日の英語学習' })
  const minutes = section.getByRole('spinbutton', { name: 'シャドテン（分）' })
  await reachableTarget(minutes)
  await minutes.tap()
  await minutes.fill('15')
  const save = section.getByRole('button', { name: 'シャドテンを保存' })
  await reachableTarget(save)
  await save.tap()
  await expect(section.getByRole('status').first()).toHaveText('保存済み')
  const elapsed = performance.now() - start
  console.log(`英語: ${(elapsed / 1000).toFixed(2)}秒 / 2タップ＋数値入力、操作対象44px以上`)
  expect(elapsed).toBeLessThan(30_000)
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('habit-tracker:study-time:v1')!))
  expect(Object.values(saved)).toContainEqual({ shadoten: 15 })
})

test('初回は前回表示なしで入力・保存でき、自重の前回値はデモの架空データだけを使う', async ({ page }) => {
  await page.goto('./')
  const section = page.getByRole('region', { name: '今日の筋トレ' })
  await section.getByLabel('種目').selectOption({ label: 'ベンチプレス' })
  await expect(section.getByRole('button', { name: '前回と同じ' })).toHaveCount(0)
  await expect(section.getByLabel('重量（kg）')).toHaveValue('')
  await expect(section.getByLabel('回数')).toHaveValue('')
  await section.getByLabel('種目').scrollIntoViewIfNeeded()
  await screenshot(page, 'workout-first-time')
  await section.getByLabel('重量（kg）').fill('50')
  await section.getByLabel('回数').fill('10')
  await section.getByRole('button', { name: '＋ セットを追加' }).tap()
  await expect(section.getByRole('list', { name: 'ベンチプレスのセット' })).toContainText('50 kg × 10回')
  await page.evaluate(() => localStorage.setItem('habit-tracker:workout-sets:v1', 'private unreadable data'))
  await page.goto('./?demo=1')
  await section.getByLabel('種目').selectOption({ label: '懸垂' })
  await expect(section.getByLabel('回数')).toHaveValue('10')
  await expect(section.getByLabel('重量（kg）')).toHaveCount(0)
  await section.getByRole('button', { name: '前回と同じ' }).tap()
  await expect(section.getByRole('list', { name: '懸垂のセット' })).toContainText('10回')
  expect(await page.evaluate(() => localStorage.getItem('habit-tracker:workout-sets:v1'))).toBe('private unreadable data')
})
