const tokyoDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
})

export function toDateKey(date: Date): string {
  const parts = tokyoDate.formatToParts(date)
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)!.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function today(now = new Date()): string {
  return toDateKey(now)
}

export function addDays(key: string, days: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !Number.isInteger(days)) {
    throw new Error('日付または日数が正しくありません。')
  }
  const date = new Date(`${key}T00:00:00Z`)
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== key) {
    throw new Error('日付が正しくありません。')
  }
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
