'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { format, parseISO } from 'date-fns'
import { Sparkles, Mic, X, Check, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase'
import { formatTime } from '@/lib/nlp'
import { tagColorClass } from '@/lib/tags'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { PRIORITY_CONFIG, type Priority } from '@/components/TodoItem'
import type { NewTodoInput } from '@/hooks/useTodos'
import { cn } from '@/lib/utils'

type ParsedTask = {
  text: string
  priority: Priority | null
  dueDate: string | null
  dueTime: string | null
  tags: string[]
}
type ReviewTask = ParsedTask & { include: boolean }

type AiTaskModalProps = {
  open: boolean
  onClose: () => void
  knownTags: string[]
  addTodo: (input: NewTodoInput) => Promise<string | null>
}

type Stage = 'input' | 'loading' | 'review'

export default function AiTaskModal({ open, onClose, knownTags, addTodo }: AiTaskModalProps) {
  const [mounted, setMounted] = useState(false)
  const [stage, setStage] = useState<Stage>('input')
  const [transcript, setTranscript] = useState('')
  const [tasks, setTasks] = useState<ReviewTask[]>([])
  const [error, setError] = useState<string | null>(null)

  const { supported, listening, interimTranscript, toggle, stop } = useSpeechRecognition({
    continuous: true,
    onResult: (t) => setTranscript((prev) => (prev ? `${prev.trim()} ${t}` : t)),
  })

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (open) { setStage('input'); setTranscript(''); setTasks([]); setError(null) }
    else stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open, onClose])

  async function generate() {
    stop()
    const text = transcript.trim()
    if (!text) { setError('Dictate or type a few tasks first.'); return }
    setStage('loading')
    setError(null)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('parse-tasks', {
        body: {
          transcript: text,
          now: new Date().toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          knownTags,
        },
      })
      if (fnErr) throw fnErr
      const parsed: ParsedTask[] = data?.tasks ?? []
      if (parsed.length === 0) {
        setError("The AI couldn't find any tasks in that. Try rephrasing.")
        setStage('input')
        return
      }
      setTasks(parsed.map((t) => ({ ...t, tags: t.tags ?? [], include: true })))
      setStage('review')
    } catch (e) {
      console.error('parse-tasks failed', e)
      setError('Could not generate tasks. Please try again.')
      setStage('input')
    }
  }

  async function createAll() {
    const chosen = tasks.filter((t) => t.include && t.text.trim())
    for (const t of chosen) {
      await addTodo({
        text: t.text.trim(),
        priority: t.priority ?? null,
        dueDate: t.dueDate ?? null,
        dueTime: t.dueTime ?? null,
        reminder: null,
        tags: t.tags ?? [],
        assignedTo: null,
      })
    }
    onClose()
  }

  const includedCount = tasks.filter((t) => t.include).length

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
        >
          <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

          <motion.div
            role="dialog" aria-modal="true" aria-label="AI task creator"
            initial={{ y: '100%', opacity: 0.6 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0.6 }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-card p-4 shadow-2xl sm:max-w-md sm:rounded-3xl"
          >
            {/* Header */}
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-primary" />
                AI task creator
              </h2>
              <button onClick={onClose} aria-label="Close"
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {stage === 'input' && (
              <div className="space-y-3 overflow-y-auto">
                <p className="text-xs text-muted-foreground">
                  Describe everything you need to do — the AI splits it into tasks with dates, priorities, and tags.
                </p>

                {supported && (
                  <div className="flex flex-col items-center gap-2 py-1">
                    <button
                      onClick={toggle}
                      aria-label={listening ? 'Stop dictation' : 'Start dictation'}
                      className={cn(
                        'flex h-16 w-16 items-center justify-center rounded-full transition-colors',
                        listening ? 'bg-rose-500/15 text-rose-500 ring-2 ring-rose-500/40' : 'bg-primary text-primary-foreground hover:bg-primary/90'
                      )}
                    >
                      <Mic className="h-6 w-6" />
                    </button>
                    <span className="text-[11px] text-muted-foreground">
                      {listening ? 'Listening… click to stop' : 'Click to speak'}
                    </span>
                  </div>
                )}

                <textarea
                  value={transcript + (interimTranscript ? ` ${interimTranscript}` : '')}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder={supported ? '…or type your tasks here' : 'Type your tasks here'}
                  rows={4}
                  className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                />

                {error && <p className="text-xs text-rose-500">{error}</p>}

                <Button onClick={generate} disabled={!transcript.trim()} className="h-11 w-full rounded-xl">
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  Generate tasks
                </Button>
              </div>
            )}

            {stage === 'loading' && (
              <div className="flex flex-col items-center gap-3 py-16">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Thinking through your tasks…</p>
              </div>
            )}

            {stage === 'review' && (
              <div className="flex min-h-0 flex-1 flex-col">
                <p className="mb-2 text-xs text-muted-foreground">Review and edit, then add the ones you want.</p>
                <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                  {tasks.map((t, i) => (
                    <li key={i} className={cn('flex items-start gap-2 rounded-xl bg-muted/50 p-2.5', !t.include && 'opacity-50')}>
                      <button
                        onClick={() => setTasks((prev) => prev.map((x, j) => j === i ? { ...x, include: !x.include } : x))}
                        aria-label={t.include ? 'Exclude task' : 'Include task'}
                        className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors',
                          t.include ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40')}
                      >
                        {t.include && <Check className="h-3 w-3" strokeWidth={3} />}
                      </button>

                      <div className="min-w-0 flex-1">
                        <input
                          value={t.text}
                          onChange={(e) => setTasks((prev) => prev.map((x, j) => j === i ? { ...x, text: e.target.value } : x))}
                          className="w-full bg-transparent text-sm font-medium outline-none"
                        />
                        {(t.priority || t.dueDate || t.tags.length > 0) && (
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            {t.priority && (
                              <span className={cn('rounded-full px-1.5 py-0 text-[10px] font-medium', PRIORITY_CONFIG[t.priority].chip)}>
                                {PRIORITY_CONFIG[t.priority].label}
                              </span>
                            )}
                            {t.dueDate && (
                              <span className="rounded-full bg-muted px-1.5 py-0 text-[10px] font-medium text-muted-foreground">
                                {format(parseISO(t.dueDate), 'MMM d')}{t.dueTime ? ` · ${formatTime(t.dueTime)}` : ''}
                              </span>
                            )}
                            {t.tags.map((tag) => (
                              <span key={tag} className={cn('rounded-full px-1.5 py-0 text-[10px] font-medium', tagColorClass(tag))}>#{tag}</span>
                            ))}
                          </div>
                        )}
                      </div>

                      <button onClick={() => setTasks((prev) => prev.filter((_, j) => j !== i))}
                        aria-label="Remove" className="mt-0.5 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>

                <div className="mt-3 flex gap-2">
                  <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setStage('input')}>Back</Button>
                  <Button className="flex-[2] rounded-xl" onClick={createAll} disabled={includedCount === 0}>
                    <Check className="mr-1.5 h-4 w-4" />
                    Add {includedCount} task{includedCount !== 1 ? 's' : ''}
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
