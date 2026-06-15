'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// ─── Minimal Web Speech API typings ──────────────────────────────────────────
// The DOM lib doesn't ship these, so we declare the slice we use.

interface SpeechRecognitionAlternative { transcript: string }
interface SpeechRecognitionResult {
  isFinal: boolean
  0: SpeechRecognitionAlternative
}
interface SpeechRecognitionResultList {
  length: number
  [index: number]: SpeechRecognitionResult
}
interface SpeechRecognitionEventLike {
  resultIndex: number
  results: SpeechRecognitionResultList
}
interface SpeechRecognitionErrorEventLike {
  error: string
  message?: string
}
interface ISpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}
type SpeechRecognitionCtor = new () => ISpeechRecognition

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor
    webkitSpeechRecognition?: SpeechRecognitionCtor
  }
}

// ─── error mapping ────────────────────────────────────────────────────────────

function friendlyError(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Microphone permission denied. Enable it in your browser settings.'
    case 'no-speech':
      return 'No speech detected. Try again.'
    case 'audio-capture':
      return 'No microphone found.'
    case 'network':
      return 'Network error during transcription.'
    case 'aborted':
      return '' // user/programmatic stop — not a real error
    default:
      return 'Speech recognition error. Please try again.'
  }
}

// ─── hook ─────────────────────────────────────────────────────────────────────

type Options = {
  /** Called with each *final* transcript chunk so the consumer can append it. */
  onResult?: (transcript: string) => void
  /** BCP-47 language tag. Defaults to the document language or en-US. */
  lang?: string
  /** Keep listening across pauses (auto-restarts on end). Defaults to true. */
  continuous?: boolean
}

export function useSpeechRecognition({ onResult, lang, continuous = true }: Options = {}) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [interimTranscript, setInterim] = useState('')
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<ISpeechRecognition | null>(null)
  const shouldListenRef = useRef(false)
  // Keep the latest onResult without re-subscribing handlers on every render.
  const onResultRef = useRef(onResult)
  useEffect(() => { onResultRef.current = onResult }, [onResult])

  // Detect support + build the recognition instance once (client only).
  useEffect(() => {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!Ctor) { setSupported(false); return }
    setSupported(true)

    const recognition = new Ctor()
    recognition.continuous = continuous
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognition.lang = lang ?? (document.documentElement.lang || 'en-US')

    recognition.onstart = () => { setError(null); setListening(true) }

    recognition.onresult = (event) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i]
        const text = result[0].transcript
        if (result.isFinal) final += text
        else interim += text
      }
      setInterim(interim)
      if (final.trim()) {
        onResultRef.current?.(final.trim())
        setInterim('')
      }
    }

    recognition.onerror = (event) => {
      const message = friendlyError(event.error)
      if (message) setError(message)
      // Fatal errors should not auto-restart.
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed' || event.error === 'audio-capture') {
        shouldListenRef.current = false
      }
    }

    recognition.onend = () => {
      setInterim('')
      // Auto-restart if the user still wants to listen (Chrome ends on silence).
      if (shouldListenRef.current) {
        try { recognition.start() } catch { /* already starting */ }
      } else {
        setListening(false)
      }
    }

    recognitionRef.current = recognition

    return () => {
      shouldListenRef.current = false
      recognition.onstart = null
      recognition.onresult = null
      recognition.onerror = null
      recognition.onend = null
      try { recognition.abort() } catch { /* noop */ }
      recognitionRef.current = null
    }
  }, [continuous, lang])

  const start = useCallback(() => {
    const recognition = recognitionRef.current
    if (!recognition || shouldListenRef.current) return
    setError(null)
    shouldListenRef.current = true
    try {
      recognition.start()
    } catch {
      // start() throws if called while already active — ignore.
    }
  }, [])

  const stop = useCallback(() => {
    const recognition = recognitionRef.current
    shouldListenRef.current = false
    setListening(false)
    setInterim('')
    try { recognition?.stop() } catch { /* noop */ }
  }, [])

  const toggle = useCallback(() => {
    if (shouldListenRef.current) stop()
    else start()
  }, [start, stop])

  return { supported, listening, interimTranscript, error, start, stop, toggle }
}
