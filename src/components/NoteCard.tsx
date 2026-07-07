'use client'

import { motion } from 'framer-motion'
import { Trash2, Link2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import type { Note } from '@/hooks/useNotes'

type NoteCardProps = {
  note: Note
  linkedCount: number
  onOpen: () => void
  onDelete: () => void
  className?: string
}

export default function NoteCard({ note, linkedCount, onOpen, onDelete, className }: NoteCardProps) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.95 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen() } }}
      className={cn(
        'group relative flex h-52 cursor-pointer flex-col rounded-xl border border-border bg-card p-3 text-left shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        className
      )}
    >
      {/* Title */}
      <h3 className={cn('pr-6 text-sm font-semibold leading-snug line-clamp-1', !note.title && 'italic text-muted-foreground/60')}>
        {note.title || 'Untitled note'}
      </h3>

      {/* Body preview */}
      <p className="mt-1.5 flex-1 overflow-hidden whitespace-pre-wrap text-[13px] leading-relaxed text-muted-foreground line-clamp-[6]">
        {note.text || 'Empty note'}
      </p>

      {/* Footer */}
      <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          {linkedCount > 0 && (
            <span className="inline-flex items-center gap-0.5">
              <Link2 className="h-2.5 w-2.5" />
              {linkedCount}
            </span>
          )}
        </span>
        <span className="truncate">{formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}</span>
      </div>

      {/* Delete (hover) */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        aria-label="Delete note"
        className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </motion.li>
  )
}
