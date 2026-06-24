'use client'

import { useEffect, useState } from 'react'
import type { Lang } from '@/lib/i18n'

const MONTHS_EN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]
const MONTHS_RU = [
  'янв', 'фев', 'мар', 'апр', 'май', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
]

/** Returns a Date that updates every second. */
export function useClock(): Date {
  const [now, setNow] = useState<Date>(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

/** Format per task spec: en → `Mon DD  HH:MM`, ru → `ДД Мес  HH:MM`. */
export function formatMenuClock(d: Date, lang: Lang): string {
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  if (lang === 'ru') {
    return `${dd} ${MONTHS_RU[d.getMonth()]}  ${hh}:${mm}`
  }
  return `${MONTHS_EN[d.getMonth()]} ${dd}  ${hh}:${mm}`
}

/** Tray clock: HH:MM. */
export function formatTrayClock(d: Date): string {
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}
