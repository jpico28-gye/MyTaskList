'use client'

import { useState, useEffect, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, type NoteRow, type NoteLinkRow } from '@/lib/supabase'

// ─── types ────────────────────────────────────────────────────────────────────

export type Note = {
  id: string
  title: string
  text: string
  createdAt: number
  updatedAt: number
}

function rowToNote(row: NoteRow): Note {
  return {
    id:        row.id,
    title:     row.title,
    text:      row.text,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  }
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
      if (!notesRes.error && notesRes.data) setNotes(notesRes.data.map(rowToNote))
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

  const addNote = useCallback(async (title: string, text: string) => {
    if (!user) return

    const now = new Date().toISOString()
    const optimistic: Note = {
      id:        crypto.randomUUID(),
      title,
      text,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    setNotes((prev) => [optimistic, ...prev])

    const { data, error } = await supabase
      .from('notes')
      .insert({ user_id: user.id, title, text, created_at: now, updated_at: now })
      .select('*')
      .single()

    if (error || !data) {
      setNotes((prev) => prev.filter((n) => n.id !== optimistic.id))
    } else {
      setNotes((prev) => prev.map((n) => n.id === optimistic.id ? rowToNote(data) : n))
    }
  }, [user])

  // ── update ─────────────────────────────────────────────────────────────────

  const updateNote = useCallback(async (id: string, fields: { title?: string; text?: string }) => {
    const updatedAt = Date.now()
    setNotes((prev) => prev.map((n) => n.id === id ? { ...n, ...fields, updatedAt } : n))

    await supabase
      .from('notes')
      .update({ ...fields, updated_at: new Date(updatedAt).toISOString() })
      .eq('id', id)
  }, [])

  // ── delete ─────────────────────────────────────────────────────────────────

  const deleteNote = useCallback(async (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id))
    setLinks((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })

    await supabase.from('notes').delete().eq('id', id)
  }, [])

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
    deleteNote,
    linkTodo,
    unlinkTodo,
  }
}
