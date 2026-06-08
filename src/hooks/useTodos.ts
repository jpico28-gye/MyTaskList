'use client'

import { useState, useEffect, useCallback } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, type TodoRow } from '@/lib/supabase'
import type { Todo, Priority } from '@/components/TodoItem'
import type { ReminderMinutes } from '@/lib/reminders'

// ─── mapping helpers ──────────────────────────────────────────────────────────

function rowToTodo(row: TodoRow): Todo {
  return {
    id:         row.id,
    text:       row.text,
    completed:  row.completed,
    createdAt:  new Date(row.created_at).getTime(),
    priority:   row.priority,
    dueDate:    row.due_date,
    dueTime:    row.due_time,
    reminder:   row.reminder,
    tags:       row.tags ?? [],
    assignedTo: row.assigned_to,
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
        user_id:     user.id,
        text:        input.text,
        completed:   false,
        priority:    input.priority,
        due_date:    input.dueDate,
        due_time:    input.dueTime,
        reminder:    input.reminder,
        tags:        input.tags,
        sort_order:  0,
        assigned_to: input.assignedTo ?? null,
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
    const current = todos.find((t) => t.id === id)
    if (!current) return

    const newCompleted = !current.completed
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, completed: newCompleted } : t))

    const { error } = await supabase
      .from('todos')
      .update({ completed: newCompleted })
      .eq('id', id)

    if (error) {
      setTodos((prev) => prev.map((t) => t.id === id ? { ...t, completed: current.completed } : t))
    }
  }, [todos])

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
    const current = todos.find((t) => t.id === id)
    if (!current) return
    const newTags = current.tags.filter((g) => g !== tag)
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, tags: newTags } : t))
    await supabase.from('todos').update({ tags: newTags }).eq('id', id)
  }, [todos])

  // ── update tags ────────────────────────────────────────────────────────────

  const updateTags = useCallback(async (id: string, tags: string[]) => {
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, tags } : t))
    await supabase.from('todos').update({ tags }).eq('id', id)
  }, [])

  // ── update schedule (due date + time) ─────────────────────────────────────

  const updateSchedule = useCallback(async (id: string, dueDate: string | null, dueTime: string | null) => {
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, dueDate, dueTime } : t))
    await supabase.from('todos').update({ due_date: dueDate, due_time: dueTime }).eq('id', id)
  }, [])

  // ── change reminder ────────────────────────────────────────────────────────

  const changeReminder = useCallback(async (id: string, reminder: ReminderMinutes) => {
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, reminder } : t))
    // reminder_sent resets so the email fires again at the new time
    await supabase.from('todos').update({ reminder, reminder_sent: false }).eq('id', id)
  }, [])

  // ── assign to ─────────────────────────────────────────────────────────────

  const assignTodo = useCallback(async (id: string, assignedTo: string | null) => {
    setTodos((prev) => prev.map((t) => t.id === id ? { ...t, assignedTo } : t))
    await supabase.from('todos').update({ assigned_to: assignedTo }).eq('id', id)
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
    updateSchedule,
    removeTag,
    updateTags,
    assignTodo,
    clearCompleted,
    reorderTodos,
  }
}
