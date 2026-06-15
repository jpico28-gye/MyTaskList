'use client'

import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Mic, MicOff } from 'lucide-react'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { cn } from '@/lib/utils'

type MicButtonProps = {
  /** Receives each final transcript chunk; append it to your field. */
  onTranscript: (text: string) => void
  /** Optional live interim text callback (not yet finalized). */
  onInterim?: (text: string) => void
  lang?: string
  className?: string
  /** When unsupported, hide entirely instead of showing a disabled button. */
  hideWhenUnsupported?: boolean
}

export default function MicButton({
  onTranscript, onInterim, lang, className, hideWhenUnsupported = false,
}: MicButtonProps) {
  const { supported, listening, interimTranscript, error, toggle } = useSpeechRecognition({
    onResult: onTranscript,
    lang,
  })

  // Surface interim text upward if the consumer wants a live preview.
  useEffect(() => { onInterim?.(interimTranscript) }, [interimTranscript, onInterim])

  if (!supported) {
    if (hideWhenUnsupported) return null
    return (
      <button
        type="button"
        disabled
        title="Voice input isn't supported in this browser. Try Chrome, Edge, or Safari."
        aria-label="Voice input unsupported"
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground/40',
          className
        )}
      >
        <MicOff className="h-3.5 w-3.5" />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={listening}
      aria-label={listening ? 'Stop voice input' : 'Start voice input'}
      title={error ?? (listening ? 'Listening… click to stop' : 'Dictate with your voice')}
      className={cn(
        'relative flex h-7 w-7 items-center justify-center rounded-full transition-colors',
        listening
          ? 'bg-rose-500/15 text-rose-500'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        error && !listening && 'text-rose-500',
        className
      )}
    >
      {/* Pulsing ring while listening */}
      <AnimatePresence>
        {listening && (
          <motion.span
            initial={{ opacity: 0.5, scale: 0.8 }}
            animate={{ opacity: 0, scale: 1.8 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
            className="absolute inset-0 rounded-full bg-rose-500/40"
          />
        )}
      </AnimatePresence>
      <Mic className="relative h-3.5 w-3.5" />
    </button>
  )
}
