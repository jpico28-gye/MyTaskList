'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { format } from 'date-fns'
import { Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import WheelColumn from '@/components/WheelColumn'

export type TimeOffset = { days: number; hours: number; minutes: number }

type TimePickerModalProps = {
  open: boolean
  onClose: () => void
  /** Fires with the resolved absolute Date (now + selected offset). */
  onConfirm: (date: Date, iso: string) => void
  initialOffset?: TimeOffset
  title?: string
  maxDays?: number
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i)
const pad2 = (n: number) => String(n).padStart(2, '0')

export default function TimePickerModal({
  open, onClose, onConfirm,
  initialOffset = { days: 0, hours: 1, minutes: 0 },
  title = 'Set time',
  maxDays = 30,
}: TimePickerModalProps) {
  const [mounted, setMounted] = useState(false)
  const [days, setDays] = useState(initialOffset.days)
  const [hours, setHours] = useState(initialOffset.hours)
  const [minutes, setMinutes] = useState(initialOffset.minutes)

  useEffect(() => setMounted(true), [])

  // Reset to the initial offset each time the modal opens.
  useEffect(() => {
    if (open) {
      setDays(initialOffset.days)
      setHours(initialOffset.hours)
      setMinutes(initialOffset.minutes)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Escape to close + lock body scroll while open.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  const target = useMemo(() => {
    const ms = ((days * 24 + hours) * 60 + minutes) * 60_000
    return new Date(Date.now() + ms)
  }, [days, hours, minutes])

  const isNow = days === 0 && hours === 0 && minutes === 0
  const relative = isNow
    ? 'Now'
    : `in ${[days && `${days}d`, hours && `${hours}h`, minutes && `${minutes}m`].filter(Boolean).join(' ')}`

  function handleConfirm() {
    onConfirm(target, target.toISOString())
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
          {/* Backdrop */}
          <button
            aria-label="Close"
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
          />

          {/* Panel — bottom sheet on mobile, centered card on desktop */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ y: '100%', opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0.6 }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="relative w-full rounded-t-3xl border border-border bg-card p-4 shadow-2xl sm:max-w-sm sm:rounded-3xl"
          >
            {/* Header */}
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-sm font-semibold">{title}</h2>
              <button
                onClick={onClose}
                aria-label="Close"
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Live preview */}
            <div className="mb-3 flex items-baseline justify-between rounded-xl bg-muted/60 px-3 py-2">
              <span className="text-sm font-medium">{format(target, 'EEE, MMM d · h:mm a')}</span>
              <span className="text-[11px] font-medium text-primary">{relative}</span>
            </div>

            {/* Wheels */}
            <div className="relative flex items-center justify-center gap-3">
              {/* Center selection band */}
              <div
                className="pointer-events-none absolute inset-x-2 top-1/2 -translate-y-1/2 rounded-xl border-y border-border bg-primary/5"
                style={{ height: 36 }}
              />
              <WheelColumn label="Days" values={range(maxDays + 1)} value={days} onChange={setDays} />
              <WheelColumn label="Hours" values={range(24)} value={hours} onChange={setHours} format={pad2} />
              <WheelColumn label="Min" values={range(60)} value={minutes} onChange={setMinutes} format={pad2} />
            </div>

            {/* Footer */}
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="lg" className="flex-1 rounded-xl" onClick={onClose}>
                Cancel
              </Button>
              <Button size="lg" className="flex-1 rounded-xl" onClick={handleConfirm} disabled={isNow}>
                <Check className="mr-1 h-4 w-4" />
                Confirm
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
