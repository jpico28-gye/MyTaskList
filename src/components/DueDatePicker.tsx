'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { format } from 'date-fns'
import { CalendarDays, Check, X, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import WheelColumn from '@/components/WheelColumn'
import { cn } from '@/lib/utils'

// ─── value shape (matches how the app stores schedule) ───────────────────────

type DuePickerProps = {
  open: boolean
  onClose: () => void
  dueDate: string | null // "YYYY-MM-DD"
  dueTime: string | null // "HH:MM" 24h
  onChange: (dueDate: string | null, dueTime: string | null) => void
  title?: string
}

const range = (n: number, start = 0) => Array.from({ length: n }, (_, i) => i + start)
const pad2 = (n: number) => String(n).padStart(2, '0')

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}
function parseDateStr(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}
function to24h(h12: number, minute: number, meridiem: 'AM' | 'PM'): string {
  let h = h12 % 12
  if (meridiem === 'PM') h += 12
  return `${pad2(h)}:${pad2(minute)}`
}

export default function DueDatePicker({
  open, onClose, dueDate, dueTime, onChange, title = 'Set due date',
}: DuePickerProps) {
  const [mounted, setMounted] = useState(false)
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [includeTime, setIncludeTime] = useState(false)
  const [hour12, setHour12] = useState(9)
  const [minute, setMinute] = useState(0)
  const [meridiem, setMeridiem] = useState<'AM' | 'PM'>('AM')

  useEffect(() => setMounted(true), [])

  // Seed local state from props each time the picker opens.
  useEffect(() => {
    if (!open) return
    setDate(dueDate ? parseDateStr(dueDate) : undefined)
    if (dueTime) {
      const [h, m] = dueTime.split(':').map(Number)
      setMeridiem(h >= 12 ? 'PM' : 'AM')
      setHour12(h % 12 || 12)
      setMinute(m)
      setIncludeTime(true)
    } else {
      setHour12(9); setMinute(0); setMeridiem('AM'); setIncludeTime(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Escape + body scroll lock.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open, onClose])

  // Quick presets resolve to an absolute date (+ time).
  const presets = useMemo(() => {
    const now = new Date()
    const at = (base: Date, h: number, m: number) => {
      const d = new Date(base); d.setHours(h, m, 0, 0); return d
    }
    const evening = at(now, 18, 0)
    if (evening.getTime() < now.getTime()) evening.setDate(evening.getDate() + 1)
    const tomorrow = at(new Date(now.getTime() + 86_400_000), 9, 0)
    const nextWeek = at(new Date(now.getTime() + 7 * 86_400_000), 9, 0)
    return [
      { label: 'In 1 hour', date: new Date(now.getTime() + 3_600_000) },
      { label: 'This evening', date: evening },
      { label: 'Tomorrow', date: tomorrow },
      { label: 'Next week', date: nextWeek },
    ]
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  function applyPreset(d: Date) {
    setDate(d)
    setMeridiem(d.getHours() >= 12 ? 'PM' : 'AM')
    setHour12(d.getHours() % 12 || 12)
    setMinute(d.getMinutes())
    setIncludeTime(true)
  }

  // Preview string: date + optional 12h time.
  const preview = !date
    ? 'No due date'
    : includeTime
      ? `${format(date, 'EEE, MMM d')} · ${hour12}:${pad2(minute)} ${meridiem}`
      : format(date, 'EEE, MMM d')

  function handleConfirm() {
    if (!date) { onChange(null, null); onClose(); return }
    onChange(toDateStr(date), includeTime ? to24h(hour12, minute, meridiem) : null)
    onClose()
  }
  function handleClear() {
    onChange(null, null)
    onClose()
  }

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

          <motion.div
            role="dialog" aria-modal="true" aria-label={title}
            initial={{ y: '100%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.6 }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="relative max-h-[90vh] w-full overflow-y-auto rounded-t-3xl border border-border bg-card p-4 shadow-2xl sm:max-w-sm sm:rounded-3xl"
          >
            {/* Header */}
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">{title}</h2>
              <button onClick={onClose} aria-label="Close"
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Live preview */}
            <div className="mb-3 flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2">
              <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
              <span className="text-sm font-medium">{preview}</span>
            </div>

            {/* Quick presets */}
            <div className="mb-3 flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button key={p.label} onClick={() => applyPreset(p.date)}
                  className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition-all hover:border-primary/50 hover:text-foreground">
                  {p.label}
                </button>
              ))}
            </div>

            {/* Calendar */}
            <div className="flex justify-center">
              <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
            </div>

            {/* Time toggle + wheels */}
            <div className="mt-2 border-t border-border/60 pt-3">
              <button
                onClick={() => setIncludeTime((v) => !v)}
                className="flex w-full items-center justify-between rounded-xl px-1 py-1 text-sm"
                aria-pressed={includeTime}
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Add a time
                </span>
                <span className={cn('flex h-5 w-9 items-center rounded-full p-0.5 transition-colors',
                  includeTime ? 'bg-primary' : 'bg-muted')}>
                  <span className={cn('h-4 w-4 rounded-full bg-white shadow transition-transform',
                    includeTime && 'translate-x-4')} />
                </span>
              </button>

              <AnimatePresence initial={false}>
                {includeTime && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }} className="overflow-hidden"
                  >
                    <div className="mt-3 flex items-center justify-center gap-4">
                      {/* Hour & Minute Wheels with isolated selection band */}
                      <div className="relative flex items-center justify-center gap-1 px-2">
                        {/* Center selection band (scoped strictly to wheels) */}
                        <div
                          className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 rounded-xl border-y border-primary/30 bg-primary/10"
                          style={{ height: 36 }}
                        />
                        <WheelColumn label="Hour" values={range(12, 1)} value={hour12} onChange={setHour12} />
                        <span className="text-sm font-bold text-muted-foreground/60 mt-4 select-none">:</span>
                        <WheelColumn label="Min" values={range(60)} value={minute} onChange={setMinute} format={pad2} />
                      </div>

                      {/* AM / PM Toggle Pills */}
                      <div className="flex flex-col gap-1.5 self-center pt-3 z-10">
                        {(['AM', 'PM'] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setMeridiem(m)}
                            className={cn(
                              'rounded-xl px-3 py-1.5 text-xs font-bold transition-all shadow-2xs',
                              meridiem === m
                                ? 'bg-primary text-primary-foreground shadow-xs scale-105'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                            )}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="lg" className="flex-1 rounded-xl" onClick={handleClear}>
                Clear
              </Button>
              <Button size="lg" className="flex-1 rounded-xl" onClick={handleConfirm}>
                <Check className="mr-1 h-4 w-4" />
                Done
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
