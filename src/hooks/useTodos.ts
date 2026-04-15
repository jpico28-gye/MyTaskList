'use client'

import { useState, useEffect, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, type TodoRow } from '@/lib/supabase'
import type { Todo, Priority } from '@/components/TodoItem'
import type { ReminderMinutes } from '@/lib/reminders'

// ─── mapping helpers ──────────────────────────────────────────────────────────

function rowToTodo(row: TodoRow): Todo {
  return {
    id:        row.id,
    text:      row.text,
    completed: row.completed,
    createdAt: new Date(row.created_at).getTime(),
    priority:  row.priority,
    dueDate:   row.due_date,
    dueTime:   row.due_time,
    reminder:  row.reminder,
    tags:      row.tags ?? [],
  }
}

// ─── hook ─────────────────────────────────────────────────────────────────────

export type NewTodoInput = Omit<Todo, 'id' | 'createdAt' | 'completed'>

export function useTodos(user: User | null) {
  const [todos,   setTodos]   = useState<Todo[]>([])
  const [loading, setLoading] = useState(false)

  // ── fetch ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) { setTodos([]); return }

    setLoading(true)
    supabase
      .from('todos')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) setTodos(data.map(rowToTodo))
        setLoading(false)
      })
  }, [user])

  // ── add ────────────────────────────────────────────────────────────────────

  const addTodo = useCallback(async (input: NewTodoInput) => {
    if (!user) return

    const optimistic: Todo = {
      ...input,
      id:        crypto.randomUUID(),
      completed: false,
      createdAt: Date.now(),
    }

    // Optimistic: prepend immediately
    setTodos((prev) => [optimistic, ...prev])

    const { data, error } = await supabase
      .from('todos')
      .insert({
        user_id:    user.id,
        text:       input.text,
        completed:  false,
        priority:   input.priority,
        due_date:   input.dueDate,
        due_time:   input.dueTime,
        reminder:   input.reminder,
        tags:       input.tags,
        sort_order: 0,              // new items go to the top
      })
      .select('*')
      .single()

    if (error || !data) {
      // Rollback
      setTodos((prev) => prev.filter((t) => t.id !== optimistic.id))
    } else {
      // Replace optimistic with real row (gets the real UUID + created_at)
      setTodos((prev) => prev.map((t) => t.id === optimistic.id ? rowToTodo(data) : t))
    }
  }, [user])

  // ── toggle ─────────────────────────────────────────────────────────────────

  const toggleTodo = useCallback(async (id: string) => {
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, completed: !t.completed } : t))

    const todo = (await supabase.from('todos').select('completed').eq('id', id).single()).data
    if (!todo) return

    const { error } = await supabase
      .from('todos')
      .update({ completed: !todo.completed })
      .eq('id', id)

    if (error) {
      setTodos((prev) => prev.map((t) => t.id === id ? { ...t, completed: !t.completed } : t))
    }
  }, [])

  // ── delete ─────────────────────────────────────────────────────────────────

  const deleteTodo = useCallback(async (id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id))

    const { error } = await supabase.from('todos').delete().eq('id', id)

    if (error) {
      // Refetch to restore (we no longer have the deleted item in memory)
      if (!user) return
      const { data } = await supabase
        .from('todos').select('*').eq('user_id', user.id).order('sort_order')
      if (data) setTodos(data.map(rowToTodo))
    }
  }, [user])

  // ── edit text ──────────────────────────────────────────────────────────────

  const editTodo = useCallback(async (id: string, text: string) => {
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, text } : t))
    await supabase.from('todos').update({ text }).eq('id', id)
  }, [])

  // ── change priority ────────────────────────────────────────────────────────

  const changePriority = useCallback(async (id: string, priority: Priority | null) => {
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, priority } : t))
    await supabase.from('todos').update({ priority }).eq('id', id)
  }, [])

  // ── remove tag ─────────────────────────────────────────────────────────────

  const removeTag = useCallback(async (id: string, tag: string) => {
    setTodos((prev) =>
      prev.map((t) => t.id === id ? { ...t, tags: t.tags.filter((g) => g !== tag) } : t)
    )
    const { data } = await supabase.from('todos').select('tags').eq('id', id).single()
    if (!data) return
    const newTags = (data.tags as string[]).filter((g: string) => g !== tag)
    await supabase.from('todos').update({ tags: newTags }).eq('id', id)
  }, [])

  // ── change reminder ────────────────────────────────────────────────────────

  const changeReminder = useCallback(async (id: string, reminder: ReminderMinutes) => {
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, reminder } : t))
    // reminder_sent resets so the email fires again at the new time
    await supabase.from('todos').update({ reminder, reminder_sent: false }).eq('id', id)
  }, [])

  // ── clear completed ────────────────────────────────────────────────────────

  const clearCompleted = useCallback(async () => {
    if (!user) return
    const ids = todos.filter((t) => t.completed).map((t) => t.id)
    if (ids.length === 0) return

    setTodos((prev) => prev.filter((t) => !t.completed))
    await supabase.from('todos').delete().in('id', ids)
  }, [todos, user])

  // ── reorder (drag-and-drop) ────────────────────────────────────────────────
  // Caller has already applied arrayMove locally; we just persist the new order.

  const reorderTodos = useCallback(async (reordered: Todo[]) => {
    setTodos(reordered)

    const updates = reordered.map((t, i) => ({ id: t.id, sort_order: i }))

    await supabase.rpc('reorder_todos', { updates })
  }, [])

  return {
    todos,
    loading,
    addTodo,
    toggleTodo,
    deleteTodo,
    editTodo,
    changePriority,
    changeReminder,
    removeTag,
    clearCompleted,
    reorderTodos,
  }
}
