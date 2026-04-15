import * as chrono from 'chrono-node'

export type NlpResult = {
  text: string       // task text with the date phrase removed
  date: Date | null
  hasTime: boolean   // true if the user specified a clock time ("at 5pm")
}

/**
 * Parse natural-language date/time out of a raw task string.
 * Uses chrono-node with forwardDate so "Monday" always means the *next* Monday.
 */
export function parseNaturalInput(raw: string): NlpResult {
  const results = chrono.parse(raw.trim(), new Date(), { forwardDate: true })

  if (!results.length) return { text: raw, date: null, hasTime: false }

  const r = results[0]
  const date = r.date()
  const hasTime = r.start.isCertain('hour')

  // Remove the matched date phrase from the text
  const before = raw.slice(0, r.index).trimEnd()
  const after  = raw.slice(r.index + r.text.length).trimStart()
  // Strip leading "at" / "on" / "by" connector words that get left behind
  const cleaned = [before, after]
    .filter(Boolean)
    .join(' ')
    .replace(/\s+(at|on|by|due|for)$/i, '')
    .trim()

  return { text: cleaned || raw.trim(), date, hasTime }
}

/** Format a Date into "HH:MM" 24-hour string for storage */
export function toTimeStr(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** Format a stored "HH:MM" string into "h:mm AM/PM" for display */
export function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}
