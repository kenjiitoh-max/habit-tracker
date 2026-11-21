import { afterEach, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import BodyTargets from './BodyTargets'

afterEach(() => vi.restoreAllMocks())

it('edits and clears targets independently, including the empty measurement state', async () => {
  const user = userEvent.setup()
  render(<BodyTargets items={[]} />)
  const edit = await screen.findByRole('button', { name: '目標を設定・変更' })
  await user.click(edit)
  await user.type(screen.getByLabelText('目標体重（kg）'), '68')
  await user.type(screen.getByLabelText('目標体脂肪率（%）'), '18')
  await user.click(screen.getByRole('button', { name: '目標を保存する' }))
  expect(screen.getByTestId('target-weightKg')).toHaveTextContent('まだ測定値がありません')
  await user.click(edit)
  await user.clear(screen.getByLabelText('目標体重（kg）'))
  await user.click(screen.getByRole('button', { name: '目標を保存する' }))
  expect(screen.getByTestId('target-weightKg')).toHaveTextContent('目標は未設定です')
  expect(screen.getByTestId('target-bodyFatPercent')).toHaveTextContent('目標：18 %')
})

it('shows invalid input and save failures without closing the editor', async () => {
  const user = userEvent.setup()
  render(<BodyTargets items={[]} />)
  await user.click(await screen.findByRole('button', { name: '目標を設定・変更' }))
  await user.type(screen.getByLabelText('目標体重（kg）'), '500')
  await user.click(screen.getByRole('button', { name: '目標を保存する' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('500未満')
  await user.clear(screen.getByLabelText('目標体重（kg）'))
  await user.type(screen.getByLabelText('目標体重（kg）'), '68')
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
  await user.click(screen.getByRole('button', { name: '目標を保存する' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('目標を保存できませんでした')
  expect(screen.getByLabelText('目標体重（kg）')).toHaveValue(68)
})
