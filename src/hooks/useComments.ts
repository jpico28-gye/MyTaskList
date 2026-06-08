'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase, type CommentRow } from '@/lib/supabase'

export type Comment = {
  id: string
  todoId: string
  userId: string
  text: string
  createdAt: number
}

function rowToComment(row: CommentRow): Comment {
  return {
    id:        row.id,
    todoId:    row.todo_id,
    userId:    row.user_id,
    text:      row.text,
    createdAt: new Date(row.created_at).getTime(),
  }
}

export function useComments(todoId: string, active: boolean, userId: string | null) {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading,  setLoading]  = useState(false)

  useEffect(() => {
    if (!active || !userId) return
    setLoading(true)
    supabase
      .from('task_comments')
      .select('*')
      .eq('todo_id', todoId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setComments((data as CommentRow[]).map(rowToComment))
        setLoading(false)
      })
  }, [active, todoId, userId])

  const addComment = useCallback(async (text: string) => {
    if (!userId) return
    const { data, error } = await supabase
      .from('task_comments')
      .insert({ todo_id: todoId, user_id: userId, text })
      .select('*')
      .single()
    if (!error && data) setComments((prev) => [...prev, rowToComment(data as CommentRow)])
  }, [todoId, userId])

  const deleteComment = useCallback(async (id: string) => {
    setComments((prev) => prev.filter((c) => c.id !== id))
    await supabase.from('task_comments').delete().eq('id', id)
  }, [])

  return { comments, loading, addComment, deleteComment }
}
