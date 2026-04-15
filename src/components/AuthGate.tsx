'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Loader2, Mail, Lock, LogIn, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { AuthState } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'

type AuthGateProps = {
  auth: AuthState
}

export default function AuthGate({ auth }: AuthGateProps) {
  const [mode,     setMode]     = useState<'signin' | 'signup'>('signin')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState<string | null>(null)
  const [success,  setSuccess]  = useState<string | null>(null)
  const [busy,     setBusy]     = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setBusy(true)

    // For sign-up, check the allowlist before creating the account
    if (mode === 'signup') {
      const { data: allowed } = await supabase.rpc('is_email_allowed', { check_email: email })
      if (!allowed) {
        setBusy(false)
        setError('This email is not approved to sign up. Please contact the administrator.')
        return
      }
    }

    const err = mode === 'signin'
      ? await auth.signIn(email, password)
      : await auth.signUp(email, password)

    setBusy(false)

    if (err) {
      setError(err.message)
    } else if (mode === 'signup') {
      setSuccess('Account created! Check your email to confirm, then sign in.')
      setMode('signin')
    }
    // On sign-in success, useAuth updates the user state and AuthGate unmounts.
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background to-muted/40 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm space-y-6"
      >
        {/* Brand */}
        <div className="text-center space-y-1">
          <h1 className="font-heading text-4xl font-bold tracking-tight">My Tasks</h1>
          <p className="text-sm text-muted-foreground">
            {mode === 'signin' ? 'Sign in to access your tasks' : 'Create an account to get started'}
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <Input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="pl-9 h-10 rounded-xl text-sm"
              />
            </div>

            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                className="pl-9 h-10 rounded-xl text-sm"
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive"
              >
                {error}
              </motion.p>
            )}

            {success && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700 dark:bg-green-950/40 dark:text-green-400"
              >
                {success}
              </motion.p>
            )}

            <Button type="submit" disabled={busy} className="w-full h-10 rounded-xl">
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === 'signin' ? (
                <><LogIn className="mr-2 h-4 w-4" />Sign in</>
              ) : (
                <><UserPlus className="mr-2 h-4 w-4" />Create account</>
              )}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-2 text-[11px] text-muted-foreground">or</span>
            </div>
          </div>

          {/* Google OAuth */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-10 rounded-xl gap-2"
            onClick={async () => { setError(null); const err = await auth.signInWithGoogle(); if (err) setError(err.message) }}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </Button>

          <button
            type="button"
            onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setSuccess(null) }}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
