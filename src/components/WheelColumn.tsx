'use client'

import { useCallback, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

const ITEM_HEIGHT = 36 // px — keep in sync with the row className below
const VISIBLE = 5       // odd number so one row sits dead-center
const PAD = ((VISIBLE - 1) / 2) * ITEM_HEIGHT

type WheelColumnProps = {
  values: number[]
  value: number
  onChange: (value: number) => void
  /** Render a value (e.g. zero-pad). Defaults to String(v). */
  format?: (value: number) => string
  label?: string
  ariaLabel?: string
}

/**
 * A native-feeling scroll/wheel picker column. Uses CSS scroll-snap for the
 * physics and reads the snapped row after scrolling settles. Works with
 * touch (mobile), wheel/drag (desktop), click-to-select, and arrow keys.
 */
export default function WheelColumn({
  values, value, onChange, format = String, label, ariaLabel,
}: WheelColumnProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const programmatic = useRef(false)

  const scrollToIndex = useCallback((index: number, smooth: boolean) => {
    const el = scrollerRef.current
    if (!el) return
    programmatic.current = true
    el.scrollTo({ top: index * ITEM_HEIGHT, behavior: smooth ? 'smooth' : 'auto' })
    // Release the guard after the (possibly smooth) scroll finishes.
    window.setTimeout(() => { programmatic.current = false }, smooth ? 320 : 50)
  }, [])

  // Keep the column aligned with the controlled value when it changes externally.
  useEffect(() => {
    const index = values.indexOf(value)
    if (index < 0) return
    const el = scrollerRef.current
    if (!el) return
    if (Math.round(el.scrollTop / ITEM_HEIGHT) !== index) scrollToIndex(index, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, values])

  const handleScroll = useCallback(() => {
    if (programmatic.current) return
    if (settleTimer.current) clearTimeout(settleTimer.current)
    settleTimer.current = setTimeout(() => {
      const el = scrollerRef.current
      if (!el) return
      const index = Math.max(0, Math.min(values.length - 1, Math.round(el.scrollTop / ITEM_HEIGHT)))
      const next = values[index]
      if (next !== value) onChange(next)
      // Re-snap exactly in case the scroll stopped between rows.
      scrollToIndex(index, true)
    }, 90)
  }, [onChange, scrollToIndex, value, values])

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    const index = values.indexOf(value)
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (index < values.length - 1) { onChange(values[index + 1]); scrollToIndex(index + 1, true) }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (index > 0) { onChange(values[index - 1]); scrollToIndex(index - 1, true) }
    }
  }, [onChange, scrollToIndex, value, values])

  useEffect(() => () => { if (settleTimer.current) clearTimeout(settleTimer.current) }, [])

  return (
    <div className="flex flex-col items-center gap-1">
      {label && <span className="text-[11px] font-medium text-muted-foreground">{label}</span>}
      <div
        ref={scrollerRef}
        onScroll={handleScroll}
        onKeyDown={handleKey}
        tabIndex={0}
        role="listbox"
        aria-label={ariaLabel ?? label}
        className="relative w-16 snap-y snap-mandatory overflow-y-auto outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ height: VISIBLE * ITEM_HEIGHT, scrollPaddingTop: PAD }}
      >
        <div style={{ paddingTop: PAD, paddingBottom: PAD }}>
          {values.map((v) => {
            const selected = v === value
            return (
              <button
                key={v}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => { onChange(v); scrollToIndex(values.indexOf(v), true) }}
                className={cn(
                  'flex w-full snap-center items-center justify-center text-base tabular-nums transition-all',
                  selected ? 'font-bold text-foreground' : 'text-muted-foreground/50 hover:text-muted-foreground'
                )}
                style={{ height: ITEM_HEIGHT }}
                tabIndex={-1}
              >
                {format(v)}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
