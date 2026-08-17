'use client'

import { motion } from 'framer-motion'
import { Trash2, Link2, Pin, Palette, FileText, Lock, EyeOff, Briefcase, Home } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Note, NoteColor, NoteScope } from '@/hooks/useNotes'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

type NoteCardProps = {
  note: Note
  linkedCount: number
  layoutMode?: 'grid' | 'list'
  onOpen: () => void
  onDelete: () => void
  onTogglePin?: () => void
  onTogglePrivate?: () => void
  onChangeColor?: (color: NoteColor) => void
  onChangeScope?: (scope: NoteScope) => void
  className?: string
}

export const NOTE_COLOR_CONFIG: Record<NoteColor, { label: string; chip: string; card: string; border: string }> = {
  default: {
    label: 'Default',
    chip: 'bg-muted text-muted-foreground',
    card: 'border-border/80 bg-card',
    border: 'border-border',
  },
  amber: {
    label: 'Amber / Idea',
    chip: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    card: 'border-amber-300/60 dark:border-amber-800/40 bg-amber-50/50 dark:bg-amber-950/20',
    border: 'border-amber-500',
  },
  emerald: {
    label: 'Emerald / Journal',
    chip: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    card: 'border-emerald-300/60 dark:border-emerald-800/40 bg-emerald-50/50 dark:bg-emerald-950/20',
    border: 'border-emerald-500',
  },
  violet: {
    label: 'Violet / Project',
    chip: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
    card: 'border-violet-300/60 dark:border-violet-800/40 bg-violet-50/50 dark:bg-violet-950/20',
    border: 'border-violet-500',
  },
  rose: {
    label: 'Rose / Important',
    chip: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
    card: 'border-rose-300/60 dark:border-rose-800/40 bg-rose-50/50 dark:bg-rose-950/20',
    border: 'border-rose-500',
  },
  blue: {
    label: 'Blue / Reference',
    chip: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
    card: 'border-blue-300/60 dark:border-blue-800/40 bg-blue-50/50 dark:bg-blue-950/20',
    border: 'border-blue-500',
  },
}

export function getWordCount(text: string): number {
  if (!text.trim()) return 0
  return text.trim().split(/\s+/).length
}

export function getReadingTime(text: string): string {
  const words = getWordCount(text)
  const minutes = Math.ceil(words / 200)
  return `${words} word${words !== 1 ? 's' : ''}${minutes > 0 ? ` · ${minutes} min read` : ''}`
}

export default function NoteCard({
  note,
  linkedCount,
  layoutMode = 'grid',
  onOpen,
  onDelete,
  onTogglePin,
  onTogglePrivate,
  onChangeColor,
  onChangeScope,
  className,
}: NoteCardProps) {
  const colorCfg = NOTE_COLOR_CONFIG[note.color ?? 'default']
  const readingStats = getReadingTime(note.text)
  const isList = layoutMode === 'list'

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      className={cn(
        'group relative flex cursor-pointer rounded-2xl border text-left shadow-2xs transition-all duration-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 overflow-hidden',
        colorCfg.card,
        note.isPrivate && 'border-dashed border-purple-400/60 dark:border-purple-600/40',
        isList ? 'flex-row items-center justify-between gap-4 h-16 px-3.5 py-2.5' : 'flex-col justify-between h-56 p-4',
        className
      )}
    >
      {/* List Layout Body */}
      {isList ? (
        <>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {onTogglePin && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onTogglePin()
                }}
                className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors',
                  note.pinned
                    ? 'text-amber-500 hover:text-amber-600'
                    : 'text-muted-foreground/40 hover:text-muted-foreground'
                )}
                title={note.pinned ? 'Unpin note' : 'Pin note'}
              >
                <Pin className={cn('h-3.5 w-3.5', note.pinned && 'fill-current')} />
              </button>
            )}

            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className={cn('text-sm font-semibold truncate', !note.title && 'italic text-muted-foreground/60')}>
                  {note.title || 'Untitled note'}
                </h3>

                {note.scope && note.scope !== 'general' && (
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.2 text-[9px] font-medium flex items-center gap-0.5 shrink-0',
                      note.scope === 'work'
                        ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                        : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    )}
                  >
                    {note.scope === 'work' ? <Briefcase className="h-2.5 w-2.5" /> : <Home className="h-2.5 w-2.5" />}
                    {note.scope}
                  </span>
                )}

                {note.isPrivate && (
                  <span className="rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 px-1.5 py-0.2 text-[9px] font-semibold flex items-center gap-0.5 shrink-0">
                    <Lock className="h-2.5 w-2.5" />
                    Private
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate max-w-lg">
                {note.text || 'Empty note'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 text-[11px] text-muted-foreground">
            {linkedCount > 0 && (
              <span className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 font-medium text-primary">
                <Link2 className="h-3 w-3" />
                {linkedCount}
              </span>
            )}
            <span className="hidden sm:inline-block truncate">
              {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
            </span>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {onTogglePrivate && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onTogglePrivate()
                  }}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
                    note.isPrivate ? 'text-purple-600 dark:text-purple-400 bg-purple-500/10' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                  title={note.isPrivate ? 'Make Public' : 'Make Private'}
                >
                  {note.isPrivate ? <Lock className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Delete note"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </>
      ) : (
        /* Grid Layout Body */
        <>
          <div>
            <div className="flex items-start justify-between gap-2 pr-16">
              <div className="space-y-1 min-w-0">
                <h3 className={cn('text-sm font-bold leading-snug line-clamp-1', !note.title && 'italic text-muted-foreground/60')}>
                  {note.title || 'Untitled note'}
                </h3>

                <div className="flex items-center gap-1 flex-wrap">
                  {note.scope && note.scope !== 'general' && (
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.2 text-[9px] font-medium flex items-center gap-0.5',
                        note.scope === 'work'
                          ? 'bg-blue-500/15 text-blue-700 dark:text-blue-300'
                          : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      )}
                    >
                      {note.scope === 'work' ? <Briefcase className="h-2.5 w-2.5" /> : <Home className="h-2.5 w-2.5" />}
                      {note.scope}
                    </span>
                  )}

                  {note.isPrivate && (
                    <span className="rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 px-1.5 py-0.2 text-[9px] font-semibold flex items-center gap-0.5">
                      <Lock className="h-2.5 w-2.5" />
                      Private
                    </span>
                  )}
                </div>
              </div>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-[4] whitespace-pre-wrap font-normal">
              {note.text || 'Empty note'}
            </p>
          </div>

          {/* Action Bar (Top Right) */}
          <div className="absolute right-2.5 top-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onTogglePrivate && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onTogglePrivate()
                }}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
                  note.isPrivate
                    ? 'text-purple-600 dark:text-purple-400 bg-purple-500/10'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
                title={note.isPrivate ? 'Make Public' : 'Make Private'}
              >
                {note.isPrivate ? <Lock className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
              </button>
            )}

            {onTogglePin && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onTogglePin()
                }}
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-lg transition-colors',
                  note.pinned
                    ? 'text-amber-500 bg-amber-500/10 opacity-100'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
                title={note.pinned ? 'Unpin note' : 'Pin note'}
              >
                <Pin className={cn('h-3.5 w-3.5', note.pinned && 'fill-current')} />
              </button>
            )}

            {onChangeColor && (
              <Popover>
                <PopoverTrigger
                  onClick={(e) => e.stopPropagation()}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  title="Change note color"
                >
                  <Palette className="h-3.5 w-3.5" />
                </PopoverTrigger>
                <PopoverContent className="w-40 p-1.5" align="end" onClick={(e) => e.stopPropagation()}>
                  <div className="grid grid-cols-3 gap-1">
                    {(Object.keys(NOTE_COLOR_CONFIG) as NoteColor[]).map((c) => {
                      const cfg = NOTE_COLOR_CONFIG[c]
                      return (
                        <button
                          key={c}
                          onClick={() => onChangeColor(c)}
                          className={cn(
                            'flex h-7 w-full items-center justify-center rounded-lg border text-[10px] font-medium transition-transform hover:scale-105',
                            cfg.card
                          )}
                          title={cfg.label}
                        >
                          <span className={cn('h-2 w-2 rounded-full', cfg.border)} />
                        </button>
                      )
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete()
              }}
              aria-label="Delete note"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Delete note"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Pinned Badge */}
          {note.pinned && (
            <div className="absolute right-3 top-3 group-hover:opacity-0 transition-opacity">
              <Pin className="h-3.5 w-3.5 text-amber-500 fill-current" />
            </div>
          )}

          {/* Card Footer */}
          <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-border/40 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1.5 min-w-0">
              {linkedCount > 0 && (
                <span className="flex items-center gap-0.5 rounded-md bg-primary/10 px-1.5 py-0.5 font-medium text-primary">
                  <Link2 className="h-2.5 w-2.5" />
                  {linkedCount}
                </span>
              )}
              <span className="truncate flex items-center gap-1">
                <FileText className="h-2.5 w-2.5 opacity-60" />
                {readingStats}
              </span>
            </div>
            <span className="truncate shrink-0 font-medium">
              {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
            </span>
          </div>
        </>
      )}
    </motion.li>
  )
}
