'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles, Mic, X, Check, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { cn } from '@/lib/utils'

type AiNoteModalProps = {
  open: boolean
  onClose: () => void
  addNote: (title: string, text: string) => void
}

type Stage = 'input' | 'loading' | 'review'

export default function AiNoteModal({ open, onClose, addNote }: AiNoteModalProps) {
  const [mounted, setMounted] = useState(false)
  const [stage, setStage] = useState<Stage>('input')
  const [transcript, setTranscript] = useState('')
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { supported, listening, interimTranscript, error: speechError, toggle, stop } = useSpeechRecognition({
    continuous: true,
    onResult: (t) => setTranscript((prev) => (prev ? `${prev.trim()} ${t}` : t)),
  })

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (open) { setStage('input'); setTranscript(''); setTitle(''); setText(''); setError(null) }
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
    const raw = transcript.trim()
    if (!raw) { setError('Dictate or type your thoughts first.'); return }
    setStage('loading')
    setError(null)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke('parse-tasks', {
        body: { mode: 'note', transcript: raw, now: new Date().toISOString() },
      })
      if (fnErr) throw fnErr
      const note = data?.note ?? { title: '', text: raw }
      setTitle(note.title ?? '')
      setText(note.text ?? raw)
      setStage('review')
    } catch (e) {
      console.error('compose-note failed', e)
      setError('Could not compose the note. Please try again.')
      setStage('input')
    }
  }

  function save() {
    if (!title.trim() && !text.trim()) return
    addNote(title.trim(), text.trim())
    onClose()
  }

  if (!mounted) return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}
        >
          <button aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity" />

          <motion.div
            role="dialog" aria-modal="true" aria-label="AI note composer"
            initial={{ y: '100%', opacity: 0.6 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0.6 }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className="relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-3xl border border-border bg-card p-4 shadow-2xl sm:max-w-md sm:rounded-3xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4 text-primary" />
                AI note
              </h2>
              <button onClick={onClose} aria-label="Close"
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {stage === 'input' && (
              <div className="space-y-3 overflow-y-auto">
                <p className="text-xs text-muted-foreground">
                  Speak or type your thoughts — the AI will tidy them into a note with a title.
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

                {!supported && (
                  <p className="rounded-lg bg-muted/60 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                    Voice input isn’t supported in this browser (try Chrome, Edge, or Safari). You can still type below.
                  </p>
                )}
                {speechError && <p className="text-xs text-rose-500">{speechError}</p>}

                <textarea
                  value={transcript + (interimTranscript ? ` ${interimTranscript}` : '')}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder={supported ? '…or type your thoughts here' : 'Type your thoughts here'}
                  rows={4}
                  className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm outline-none placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                />

                {error && <p className="text-xs text-rose-500">{error}</p>}

                <Button onClick={generate} disabled={!transcript.trim()} className="h-11 w-full rounded-xl">
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  Compose note
                </Button>
              </div>
            )}

            {stage === 'loading' && (
              <div className="flex flex-col items-center gap-3 py-16">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Writing your note…</p>
              </div>
            )}

            {stage === 'review' && (
              <div className="space-y-3 overflow-y-auto">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title"
                  className="h-10 rounded-xl text-sm font-semibold"
                />
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={8}
                  className="w-full resize-none rounded-xl border border-border bg-background p-3 text-sm leading-relaxed outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                />
                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setStage('input')}>Back</Button>
                  <Button className="flex-[2] rounded-xl" onClick={save} disabled={!title.trim() && !text.trim()}>
                    <Check className="mr-1.5 h-4 w-4" />
                    Save note
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
