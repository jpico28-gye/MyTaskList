'use client'

import { useState, useEffect, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, type NoteRow, type NoteLinkRow } from '@/lib/supabase'

// ─── types ────────────────────────────────────────────────────────────────────

export type NoteColor = 'default' | 'amber' | 'emerald' | 'violet' | 'rose' | 'blue'
export type NoteScope = 'work' | 'personal' | 'general'

export type NoteMeta = {
  color?: NoteColor
  scope?: NoteScope
  pinned?: boolean
  isPrivate?: boolean
}

export type Note = {
  id: string
  title: string
  text: string
  color?: NoteColor
  scope?: NoteScope
  pinned?: boolean
  isPrivate?: boolean
  createdAt: number
  updatedAt: number
}

type ExtendedNoteRow = NoteRow & {
  color?: NoteColor
  scope?: NoteScope
  pinned?: boolean
  is_private?: boolean
}

function rowToNote(row: ExtendedNoteRow): Note {
  return {
    id:        row.id,
    title:     row.title,
    text:      row.text,
    color:     row.color ?? 'default',
    scope:     row.scope ?? 'general',
    pinned:    Boolean(row.pinned),
    isPrivate: Boolean(row.is_private),
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  }
}

// ─── localstorage persistence helpers ────────────────────────────────────────

function getStoredMetaMap(userId: string): Record<string, NoteMeta> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(`mytasklist_note_meta_${userId}`)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveStoredMeta(userId: string, noteId: string, meta: NoteMeta) {
  if (typeof window === 'undefined') return
  try {
    const current = getStoredMetaMap(userId)
    current[noteId] = { ...current[noteId], ...meta }
    localStorage.setItem(`mytasklist_note_meta_${userId}`, JSON.stringify(current))
  } catch {}
}

function removeStoredMeta(userId: string, noteId: string) {
  if (typeof window === 'undefined') return
  try {
    const current = getStoredMetaMap(userId)
    delete current[noteId]
    localStorage.setItem(`mytasklist_note_meta_${userId}`, JSON.stringify(current))
  } catch {}
}

// ─── hook ─────────────────────────────────────────────────────────────────────

export function useNotes(user: User | null) {
  const [notes,   setNotes]   = useState<Note[]>([])
  const [links,   setLinks]   = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(false)

  // ── fetch ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) { setNotes([]); setLinks({}); return }

    setLoading(true)

    Promise.all([
      supabase
        .from('notes')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false }),
      supabase
        .from('note_links')
        .select('*')
        .eq('user_id', user.id),
    ]).then(([notesRes, linksRes]) => {
      if (!notesRes.error && notesRes.data) {
        const metaMap = getStoredMetaMap(user.id)
        const parsed = (notesRes.data as ExtendedNoteRow[]).map((row) => {
          const base = rowToNote(row)
          const stored = metaMap[base.id]
          if (stored) {
            return {
              ...base,
              color: stored.color ?? base.color,
              scope: stored.scope ?? base.scope,
              pinned: stored.pinned ?? base.pinned,
              isPrivate: stored.isPrivate ?? base.isPrivate,
            }
          }
          return base
        })
        setNotes(parsed)
      }

      if (!linksRes.error && linksRes.data) {
        const map: Record<string, string[]> = {}
        for (const row of linksRes.data as NoteLinkRow[]) {
          if (!map[row.note_id]) map[row.note_id] = []
          map[row.note_id].push(row.todo_id)
        }
        setLinks(map)
      }
      setLoading(false)
    })
  }, [user])

  // ── add ────────────────────────────────────────────────────────────────────

  const addNote = useCallback(async (
    title: string,
    text: string,
    color: NoteColor = 'default',
    pinned = false,
    scope: NoteScope = 'general',
    isPrivate = false
  ) => {
    if (!user) return

    const now = new Date().toISOString()
    const id = crypto.randomUUID()
    const optimistic: Note = {
      id,
      title,
      text,
      color,
      scope,
      pinned,
      isPrivate,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    // Persist metadata locally immediately
    saveStoredMeta(user.id, id, { color, scope, pinned, isPrivate })

    setNotes((prev) => [optimistic, ...prev])

    const insertPayload: Record<string, unknown> = {
      id,
      user_id: user.id,
      title,
      text,
      color,
      scope,
      pinned,
      is_private: isPrivate,
      created_at: now,
      updated_at: now,
    }

    const { data, error } = await supabase
      .from('notes')
      .insert(insertPayload)
      .select('*')
      .single()

    if (error) {
      // Retry without extra columns if DB schema lacks them
      const fallbackPayload = { id, user_id: user.id, title, text, created_at: now, updated_at: now }
      const { data: fallbackData } = await supabase
        .from('notes')
        .insert(fallbackPayload)
        .select('*')
        .single()

      if (fallbackData) {
        setNotes((prev) => prev.map((n) => n.id === id ? optimistic : n))
      }
    } else if (data) {
      setNotes((prev) => prev.map((n) => n.id === id ? { ...rowToNote(data), color, scope, pinned, isPrivate } : n))
    }
  }, [user])

  // ── update ─────────────────────────────────────────────────────────────────

  const updateNote = useCallback(async (
    id: string,
    fields: { title?: string; text?: string; color?: NoteColor; scope?: NoteScope; pinned?: boolean; isPrivate?: boolean }
  ) => {
    if (!user) return
    const updatedAt = Date.now()

    // Save metadata locally immediately
    const metaToSave: NoteMeta = {}
    if (fields.color !== undefined) metaToSave.color = fields.color
    if (fields.scope !== undefined) metaToSave.scope = fields.scope
    if (fields.pinned !== undefined) metaToSave.pinned = fields.pinned
    if (fields.isPrivate !== undefined) metaToSave.isPrivate = fields.isPrivate
    saveStoredMeta(user.id, id, metaToSave)

    setNotes((prev) => prev.map((n) => n.id === id ? { ...n, ...fields, updatedAt } : n))

    const payload: Record<string, unknown> = { updated_at: new Date(updatedAt).toISOString() }
    if (fields.title !== undefined) payload.title = fields.title
    if (fields.text !== undefined) payload.text = fields.text
    if (fields.color !== undefined) payload.color = fields.color
    if (fields.scope !== undefined) payload.scope = fields.scope
    if (fields.pinned !== undefined) payload.pinned = fields.pinned
    if (fields.isPrivate !== undefined) payload.is_private = fields.isPrivate

    const { error } = await supabase
      .from('notes')
      .update(payload)
      .eq('id', id)

    if (error) {
      // Fallback update without new schema columns if error
      await supabase
        .from('notes')
        .update({
          ...(fields.title !== undefined && { title: fields.title }),
          ...(fields.text !== undefined && { text: fields.text }),
          updated_at: new Date(updatedAt).toISOString(),
        })
        .eq('id', id)
    }
  }, [user])

  // ── toggle pin ─────────────────────────────────────────────────────────────

  const togglePinNote = useCallback((id: string) => {
    if (!user) return
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id === id) {
          const nextPinned = !n.pinned
          saveStoredMeta(user.id, id, { pinned: nextPinned })
          return { ...n, pinned: nextPinned }
        }
        return n
      })
    )
  }, [user])

  // ── toggle private / hidden ────────────────────────────────────────────────

  const togglePrivateNote = useCallback((id: string) => {
    if (!user) return
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id === id) {
          const nextPrivate = !n.isPrivate
          saveStoredMeta(user.id, id, { isPrivate: nextPrivate })
          return { ...n, isPrivate: nextPrivate }
        }
        return n
      })
    )
  }, [user])

  // ── delete ─────────────────────────────────────────────────────────────────

  const deleteNote = useCallback(async (id: string) => {
    if (user) removeStoredMeta(user.id, id)
    setNotes((prev) => prev.filter((n) => n.id !== id))
    setLinks((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })

    await supabase.from('notes').delete().eq('id', id)
  }, [user])

  // ── link / unlink tasks ────────────────────────────────────────────────────

  const linkTodo = useCallback(async (noteId: string, todoId: string) => {
    if (!user) return

    setLinks((prev) => ({
      ...prev,
      [noteId]: prev[noteId]?.includes(todoId) ? prev[noteId] : [...(prev[noteId] ?? []), todoId],
    }))

    const { error } = await supabase
      .from('note_links')
      .insert({ note_id: noteId, todo_id: todoId, user_id: user.id })

    if (error) {
      setLinks((prev) => ({ ...prev, [noteId]: (prev[noteId] ?? []).filter((id) => id !== todoId) }))
    }
  }, [user])

  const unlinkTodo = useCallback(async (noteId: string, todoId: string) => {
    setLinks((prev) => ({ ...prev, [noteId]: (prev[noteId] ?? []).filter((id) => id !== todoId) }))

    await supabase.from('note_links').delete().eq('note_id', noteId).eq('todo_id', todoId)
  }, [])

  return {
    notes,
    links,
    loading,
    addNote,
    updateNote,
    togglePinNote,
    togglePrivateNote,
    deleteNote,
    linkTodo,
    unlinkTodo,
  }
}
