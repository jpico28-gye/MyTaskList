import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Lazy singleton — only created when first accessed (never during SSR prerender).
let _client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
    _client = createClient(url, key)
  }
  return _client
}

// Convenience re-export so call sites can still write `supabase.from(...)`.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as unknown as Record<string | symbol, unknown>)[prop]
  },
})

// ─── DB row shape (snake_case, mirrors the Postgres table) ───────────────────

export type TodoRow = {
  id:          string
  user_id:     string
  text:        string
  completed:   boolean
  created_at:  string   // ISO timestamp
  priority:    'low' | 'medium' | 'high' | null
  due_date:    string | null   // "YYYY-MM-DD"
  due_time:    string | null   // "HH:MM"
  reminder:    number | null   // minutes before due
  tags:        string[]
  sort_order:  number
}
