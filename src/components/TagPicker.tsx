'use client'

import { useState, useRef, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Tag, X, Plus, Check } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { tagColorClass } from '@/lib/tags'

type TagPickerProps = {
  /** All tags that exist across current todos (for suggestions). */
  existingTags: string[]
  /** Tags selected for the pending new task. */
  selected: string[]
  onChange: (tags: string[]) => void
}

export default function TagPicker({ existingTags, selected, onChange }: TagPickerProps) {
  const [open, setOpen]       = useState(false)
  const [query, setQuery]     = useState('')
  const inputRef              = useRef<HTMLInputElement>(null)

  // Focus search input when popover opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
    else setQuery('')
  }, [open])

  const q = query.trim().toLowerCase()

  // Tags that match the search query
  const suggestions = existingTags.filter(
    (t) => t.toLowerCase().includes(q) && !selected.includes(t)
  )

  // Can create a new tag if query is non-empty, valid, and not already selected/existing
  const canCreate =
    q.length > 0 &&
    /^\w+$/.test(q) &&
    !selected.includes(q) &&
    !existingTags.includes(q)

  function toggle(tag: string) {
    onChange(selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag])
  }

  function create() {
    if (!canCreate) return
    onChange([...selected, q])
    setQuery('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); create() }
    if (e.key === 'Backspace' && !query && selected.length > 0) {
      onChange(selected.slice(0, -1))
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1">
      {/* Selected tag chips */}
      <AnimatePresence initial={false}>
        {selected.map((tag) => (
          <motion.span
            key={tag}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.12 }}
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[11px] font-medium',
              tagColorClass(tag)
            )}
          >
            #{tag}
            <button
              onClick={() => toggle(tag)}
              aria-label={`Remove #${tag}`}
              className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </motion.span>
        ))}
      </AnimatePresence>

      {/* Picker trigger */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            'flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-all',
            selected.length > 0
              ? 'border-transparent bg-muted text-foreground'
              : 'border-border text-muted-foreground hover:border-muted-foreground/50'
          )}
          aria-label="Pick tags"
        >
          <Tag className="h-3 w-3" />
          {selected.length === 0 ? 'Tags' : 'Add tag'}
        </PopoverTrigger>

        <PopoverContent align="start" className="w-56 p-2 space-y-2">
          {/* Search / create input */}
          <div className="relative">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value.replace(/\s/g, '').toLowerCase())}
              onKeyDown={handleKeyDown}
              placeholder="Search or create tag…"
              className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs outline-none placeholder:text-muted-foreground/60 focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
            />
          </div>

          {/* Create new tag option */}
          {canCreate && (
            <button
              onClick={create}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
            >
              <Plus className="h-3 w-3 shrink-0" />
              Create <span className={cn('ml-0.5 rounded-full px-1.5 font-medium', tagColorClass(q))}>#{q}</span>
            </button>
          )}

          {/* Existing tag suggestions */}
          {suggestions.length > 0 && (
            <div className="space-y-0.5">
              {suggestions.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggle(tag)}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs hover:bg-muted transition-colors"
                >
                  <span className={cn('rounded-full px-2 py-0.5 font-medium', tagColorClass(tag))}>
                    #{tag}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Already-selected tags (with checkmark to deselect) */}
          {selected.length > 0 && (
            <>
              {(suggestions.length > 0 || canCreate) && (
                <div className="border-t border-border pt-1.5" />
              )}
              <div className="space-y-0.5">
                {selected.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggle(tag)}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs hover:bg-muted transition-colors"
                  >
                    <span className={cn('rounded-full px-2 py-0.5 font-medium', tagColorClass(tag))}>
                      #{tag}
                    </span>
                    <Check className="h-3 w-3 text-primary shrink-0" />
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Empty state */}
          {!canCreate && suggestions.length === 0 && selected.length === 0 && (
            <p className="px-2 py-2 text-center text-xs text-muted-foreground">
              {q ? 'No matching tags.' : 'No tags yet — type to create one.'}
            </p>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
