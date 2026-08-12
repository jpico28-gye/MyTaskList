'use client'

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sun, Moon, Bell, BellOff, LogOut, PlusCircle, Sparkles,
  CalendarDays, Calendar, Clock, CheckCircle2, Inbox, StickyNote,
  Tag, ChevronRight, ChevronDown, PanelLeftClose, PanelLeftOpen,
  X, Check, Flame, Target, User, ShieldCheck, Filter, Palette
} from 'lucide-react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import type { Todo, Priority } from '@/components/TodoItem'
import type { Note } from '@/hooks/useNotes'
import type { BackgroundPreset } from '@/components/AmbientBackground'
import { cn } from '@/lib/utils'
import { tagColorClass } from '@/lib/tags'
import { PRIORITY_CONFIG } from '@/components/TodoItem'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

export type SmartView = 'all' | 'today' | 'upcoming' | 'reminders' | 'completed' | 'notes'

interface SidebarProps {
  user: SupabaseUser
  todos: Todo[]
  notes: Note[]
  currentView: 'tasks' | 'notes'
  smartView: SmartView
  selectedPriority: Priority | null
  activeTags: string[]
  allTags: string[]
  dark: boolean
  permission: NotificationPermission
  collapsed: boolean
  mobileOpen: boolean
  bgPreset: BackgroundPreset
  onToggleCollapse: () => void
  onCloseMobile: () => void
  onSelectSmartView: (view: SmartView) => void
  onSelectPriority: (priority: Priority | null) => void
  onToggleTag: (tag: string) => void
  onClearTagFilters: () => void
  onToggleDark: () => void
  onRequestNotification: () => Promise<unknown>
  onSignOut: () => void
  onOpenQuickTask: () => void
  onOpenAiTask: () => void
  onSelectBgPreset: (preset: BackgroundPreset) => void
}

function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Sidebar({
  user,
  todos,
  notes,
  currentView,
  smartView,
  selectedPriority,
  activeTags,
  allTags,
  dark,
  permission,
  collapsed,
  mobileOpen,
  bgPreset,
  onToggleCollapse,
  onCloseMobile,
  onSelectSmartView,
  onSelectPriority,
  onToggleTag,
  onClearTagFilters,
  onToggleDark,
  onRequestNotification,
  onSignOut,
  onOpenQuickTask,
  onOpenAiTask,
  onSelectBgPreset,
}: SidebarProps) {
  const [tagsExpanded, setTagsExpanded] = useState(true)
  const [priorityExpanded, setPriorityExpanded] = useState(true)

  const todayStr = useMemo(() => toDateStr(new Date()), [])

  // Calculate real-time counts
  const counts = useMemo(() => {
    let todayCount = 0
    let upcomingCount = 0
    let remindersCount = 0
    let activeInboxCount = 0
    let completedCount = 0
    let todayTotal = 0
    let todayCompleted = 0

    const highPriorityCount = todos.filter((t) => !t.completed && t.priority === 'high').length
    const mediumPriorityCount = todos.filter((t) => !t.completed && t.priority === 'medium').length
    const lowPriorityCount = todos.filter((t) => !t.completed && t.priority === 'low').length

    todos.forEach((t) => {
      if (t.completed) {
        completedCount++
      } else {
        activeInboxCount++
      }

      if (t.dueDate === todayStr) {
        todayTotal++
        if (t.completed) {
          todayCompleted++
        } else {
          todayCount++
        }
      } else if (t.dueDate && t.dueDate > todayStr && !t.completed) {
        upcomingCount++
      }

      if (t.reminder !== null && !t.completed) {
        remindersCount++
      }
    })

    const tagCounts: Record<string, number> = {}
    allTags.forEach((tag) => {
      tagCounts[tag] = todos.filter((t) => !t.completed && t.tags.includes(tag)).length
    })

    const todayProgressPct = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0

    return {
      today: todayCount,
      upcoming: upcomingCount,
      reminders: remindersCount,
      inbox: activeInboxCount,
      completed: completedCount,
      notes: notes.length,
      highPriority: highPriorityCount,
      mediumPriority: mediumPriorityCount,
      lowPriority: lowPriorityCount,
      tagCounts,
      todayTotal,
      todayCompleted,
      todayProgressPct,
    }
  }, [todos, notes, todayStr, allTags])

  const userInitials = useMemo(() => {
    if (!user.email) return 'U'
    const parts = user.email.split('@')[0].split(/[._-]/)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    return user.email.substring(0, 2).toUpperCase()
  }, [user.email])

  const navItems = [
    {
      id: 'today' as SmartView,
      label: 'Today',
      icon: CalendarDays,
      count: counts.today,
      badgeColor: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
      activeColor: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 font-semibold',
    },
    {
      id: 'upcoming' as SmartView,
      label: 'Upcoming',
      icon: Calendar,
      count: counts.upcoming,
      badgeColor: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
      activeColor: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 font-semibold',
    },
    {
      id: 'all' as SmartView,
      label: 'Inbox',
      icon: Inbox,
      count: counts.inbox,
      badgeColor: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
      activeColor: 'bg-violet-500/10 text-violet-700 dark:text-violet-300 font-semibold',
    },
    {
      id: 'reminders' as SmartView,
      label: 'Reminders',
      icon: Clock,
      count: counts.reminders,
      badgeColor: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
      activeColor: 'bg-purple-500/10 text-purple-700 dark:text-purple-300 font-semibold',
    },
    {
      id: 'notes' as SmartView,
      label: 'Notes',
      icon: StickyNote,
      count: counts.notes,
      badgeColor: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
      activeColor: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold',
    },
    {
      id: 'completed' as SmartView,
      label: 'Completed',
      icon: CheckCircle2,
      count: counts.completed,
      badgeColor: 'bg-muted text-muted-foreground',
      activeColor: 'bg-muted text-foreground font-semibold',
    },
  ]

  const bgPresets: { id: BackgroundPreset; label: string; icon: string }[] = [
    { id: 'aurora', label: 'Aurora Mesh', icon: '🌌' },
    { id: 'grid', label: 'Subtle Grid', icon: '📐' },
    { id: 'sunset', label: 'Sunset Glow', icon: '🌅' },
    { id: 'minimal', label: 'Minimal', icon: '🍃' },
  ]

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between p-3 select-none">
      {/* Upper Area */}
      <div className="space-y-4">
        {/* Workspace Brand & Profile Header */}
        <div className="flex items-center justify-between pb-2 border-b border-border/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-500 text-white shadow-md shadow-violet-500/20 font-bold text-xs">
              {userInitials}
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-background" title="Online" />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="truncate text-xs font-semibold text-foreground" title={user.email}>
                  {user.email}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <ShieldCheck className="h-3 w-3 text-emerald-500 shrink-0" />
                  Personal Workspace
                </span>
              </div>
            )}
          </div>

          {/* Header Action Buttons (Desktop Collapse / Mobile Close) */}
          <div className="flex items-center gap-1">
            {mobileOpen ? (
              <button
                onClick={onCloseMobile}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={onToggleCollapse}
                className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                title={collapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
                aria-label="Toggle sidebar collapse"
              >
                {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Action Buttons: Quick Task Creation & AI */}
        <div className="space-y-1.5">
          <button
            onClick={() => {
              onOpenQuickTask()
              if (mobileOpen) onCloseMobile()
            }}
            className={cn(
              'group flex w-full items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground font-medium text-xs shadow-sm transition-all hover:bg-primary/95 active:scale-[0.98]',
              collapsed ? 'h-10 w-10 p-0 mx-auto' : 'h-10 px-3 py-2'
            )}
            title="Create Task"
          >
            <PlusCircle className="h-4 w-4 shrink-0 transition-transform group-hover:rotate-90" />
            {!collapsed && <span>New Task</span>}
          </button>

          {!collapsed && (
            <button
              onClick={() => {
                onOpenAiTask()
                if (mobileOpen) onCloseMobile()
              }}
              className="flex w-full items-center justify-between rounded-xl border border-violet-200/60 dark:border-violet-800/40 bg-gradient-to-r from-violet-50/50 to-indigo-50/30 dark:from-violet-950/20 dark:to-indigo-950/20 px-3 py-2 text-xs font-medium text-violet-700 dark:text-violet-300 transition-all hover:border-violet-300 dark:hover:border-violet-700"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
                AI Task Generator
              </span>
              <span className="rounded-full bg-violet-600/10 dark:bg-violet-400/10 px-1.5 py-0.5 text-[9px] font-semibold text-violet-600 dark:text-violet-400">
                Magic
              </span>
            </button>
          )}
        </div>

        {/* Main Smart Navigation Views */}
        <div className="space-y-1">
          {!collapsed && (
            <span className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Overview
            </span>
          )}
          {navItems.map((item) => {
            const Icon = item.icon
            const isCurrent = (currentView === 'notes' && item.id === 'notes') || (currentView === 'tasks' && smartView === item.id)

            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectSmartView(item.id)
                  if (mobileOpen) onCloseMobile()
                }}
                className={cn(
                  'flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-xs transition-colors',
                  isCurrent
                    ? item.activeColor
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                  collapsed && 'justify-center px-0'
                )}
                title={item.label}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={cn('h-4 w-4 shrink-0', isCurrent ? 'text-primary' : 'text-muted-foreground')} />
                  {!collapsed && <span className="truncate">{item.label}</span>}
                </div>
                {!collapsed && (
                  <span
                    className={cn(
                      'ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium min-w-[20px] text-center',
                      item.badgeColor
                    )}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Priority Filters */}
        {!collapsed && (
          <div className="space-y-1 pt-1">
            <div
              onClick={() => setPriorityExpanded(!priorityExpanded)}
              className="flex items-center justify-between px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 cursor-pointer hover:text-foreground"
            >
              <span className="flex items-center gap-1">
                <Filter className="h-3 w-3" /> Priorities
              </span>
              {priorityExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </div>

            {priorityExpanded && (
              <div className="space-y-0.5 pt-0.5">
                {(['high', 'medium', 'low'] as Priority[]).map((p) => {
                  const cfg = PRIORITY_CONFIG[p]
                  const isSelected = selectedPriority === p
                  const count = p === 'high' ? counts.highPriority : p === 'medium' ? counts.mediumPriority : counts.lowPriority

                  return (
                    <button
                      key={p}
                      onClick={() => onSelectPriority(isSelected ? null : p)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition-colors',
                        isSelected
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn('h-2 w-2 rounded-full', cfg.dot)} />
                        <span>{cfg.label} Priority</span>
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground">{count}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Tags / Projects List */}
        {!collapsed && allTags.length > 0 && (
          <div className="space-y-1 pt-1">
            <div
              onClick={() => setTagsExpanded(!tagsExpanded)}
              className="flex items-center justify-between px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 cursor-pointer hover:text-foreground"
            >
              <span className="flex items-center gap-1">
                <Tag className="h-3 w-3" /> Tags & Projects
              </span>
              {tagsExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </div>

            {tagsExpanded && (
              <div className="space-y-0.5 pt-0.5 max-h-36 overflow-y-auto pr-1">
                {allTags.map((tag) => {
                  const active = activeTags.includes(tag)
                  const count = counts.tagCounts[tag] ?? 0

                  return (
                    <button
                      key={tag}
                      onClick={() => onToggleTag(tag)}
                      className={cn(
                        'flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-xs transition-all',
                        active
                          ? 'bg-primary/15 text-primary font-semibold'
                          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn('rounded-full px-1.5 py-0.5 text-[10px]', tagColorClass(tag))}>
                          #{tag}
                        </span>
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground">{count}</span>
                    </button>
                  )
                })}

                {activeTags.length > 0 && (
                  <button
                    onClick={onClearTagFilters}
                    className="w-full text-center py-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear tag filters ({activeTags.length})
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lower Area: Productivity Snapshot & Footer Controls */}
      <div className="space-y-3 pt-3 border-t border-border/50">
        {/* Productivity Progress Widget */}
        {!collapsed && counts.todayTotal > 0 && (
          <div className="rounded-xl border border-border/70 bg-card/60 p-2.5 shadow-xs space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 font-medium text-foreground text-[11px]">
                <Target className="h-3.5 w-3.5 text-emerald-500" />
                Today's Goal
              </span>
              <span className="text-[10px] font-semibold text-muted-foreground">
                {counts.todayCompleted}/{counts.todayTotal} ({counts.todayProgressPct}%)
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${counts.todayProgressPct}%` }}
                transition={{ duration: 0.5 }}
                className="h-full rounded-full bg-emerald-500"
              />
            </div>
          </div>
        )}

        {/* Quick Settings & User Action Controls */}
        <div className="flex items-center justify-between px-1">
          {/* Notifications Toggle */}
          <button
            onClick={onRequestNotification}
            className={cn(
              'flex h-8 w-8 items-center justify-center rounded-xl border transition-colors',
              permission === 'granted'
                ? 'border-violet-300 bg-violet-50 text-violet-600 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-400'
                : 'border-border bg-background text-muted-foreground hover:text-foreground'
            )}
            title={permission === 'granted' ? 'Notifications enabled' : 'Enable notifications'}
            aria-label="Toggle notifications"
          >
            {permission === 'granted' ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
          </button>

          {/* Background Ambient Style Selector */}
          <Popover>
            <PopoverTrigger
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground shadow-xs transition-colors hover:text-foreground"
              title="Background ambient style"
              aria-label="Background ambient style"
            >
              <Palette className="h-3.5 w-3.5" />
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1.5" align="center">
              <div className="space-y-1">
                <span className="px-2 text-[10px] font-semibold uppercase text-muted-foreground">Background Style</span>
                {bgPresets.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => onSelectBgPreset(p.id)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition-colors',
                      bgPreset === p.id
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <span>{p.icon}</span>
                      <span>{p.label}</span>
                    </span>
                    {bgPreset === p.id && <Check className="h-3.5 w-3.5" />}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Theme Toggle */}
          <button
            onClick={onToggleDark}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground shadow-xs transition-colors hover:text-foreground"
            title={dark ? 'Light mode' : 'Dark mode'}
            aria-label="Toggle theme"
          >
            {dark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </button>

          {/* Sign Out */}
          <button
            onClick={onSignOut}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground shadow-xs transition-colors hover:text-destructive"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col shrink-0 border-r border-border/70 bg-card/60 backdrop-blur-xl transition-all duration-300 sticky top-0 h-screen',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />

            {/* Sliding Panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 250 }}
              className="absolute inset-y-0 left-0 w-72 border-r border-border bg-card shadow-2xl"
            >
              {sidebarContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
