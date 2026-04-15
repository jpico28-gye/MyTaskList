'use client'

import { motion } from 'framer-motion'
import { Inbox, CheckCircle2, PartyPopper, Tag, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'

export type EmptyVariant =
  | 'no-tasks'       // list is genuinely empty
  | 'all-caught-up'  // todos exist but every one is done
  | 'no-active'      // active filter, nothing remaining
  | 'no-completed'   // completed filter, nothing finished yet
  | 'no-tag-match'   // tag filter returned nothing

const CONFIG: Record<
  EmptyVariant,
  { Icon: React.ElementType; iconClass: string; title: string; body: string }
> = {
  'no-tasks': {
    Icon: Inbox,
    iconClass: 'text-muted-foreground/30',
    title: 'Nothing here yet',
    body: 'Add your first task above to get started.',
  },
  'all-caught-up': {
    Icon: PartyPopper,
    iconClass: 'text-amber-400',
    title: "You're all caught up!",
    body: 'Every task is done — treat yourself.',
  },
  'no-active': {
    Icon: CheckCircle2,
    iconClass: 'text-emerald-400',
    title: 'Nothing left to do',
    body: "All active tasks are finished — great work!",
  },
  'no-completed': {
    Icon: ClipboardList,
    iconClass: 'text-muted-foreground/30',
    title: 'No completed tasks',
    body: "Finish a task and it'll show up here.",
  },
  'no-tag-match': {
    Icon: Tag,
    iconClass: 'text-muted-foreground/30',
    title: 'No matching tasks',
    body: 'Try a different tag or clear the filter.',
  },
}

// Decorative sparkle ring — only shown for celebratory states
function SparkleRing({ color }: { color: string }) {
  const COUNT = 8
  return (
    <div className="absolute inset-0 pointer-events-none">
      {Array.from({ length: COUNT }).map((_, i) => {
        const angle = (i / COUNT) * 360
        const delay = i * 0.06
        return (
          <motion.span
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0, 1, 0.4] }}
            transition={{ duration: 1.2, delay, repeat: Infinity, repeatDelay: 2.5 }}
            style={{ rotate: angle, transformOrigin: '50% 50%' }}
            className="absolute inset-0 flex items-start justify-center"
          >
            <span
              className="mt-1 block h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: color, marginTop: '-20px' }}
            />
          </motion.span>
        )
      })}
    </div>
  )
}

type EmptyStateProps = {
  variant: EmptyVariant
  className?: string
}

export default function EmptyState({ variant, className }: EmptyStateProps) {
  const { Icon, iconClass, title, body } = CONFIG[variant]
  const isCelebration = variant === 'all-caught-up' || variant === 'no-active'

  return (
    <motion.div
      key={variant}
      initial={{ opacity: 0, scale: 0.96, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className={cn(
        'flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-14 px-6 text-center',
        className
      )}
    >
      {/* Icon with optional sparkle ring */}
      <div className="relative flex h-16 w-16 items-center justify-center">
        {isCelebration && <SparkleRing color={variant === 'all-caught-up' ? '#fbbf24' : '#34d399'} />}
        <motion.div
          initial={{ scale: 0.5, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18, delay: 0.05 }}
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-2xl',
            isCelebration ? 'bg-muted/60' : 'bg-muted/40'
          )}
        >
          <Icon className={cn('h-7 w-7', iconClass)} />
        </motion.div>
      </div>

      <div className="space-y-1">
        <motion.p
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-sm font-semibold text-foreground"
        >
          {title}
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.17 }}
          className="text-xs text-muted-foreground"
        >
          {body}
        </motion.p>
      </div>
    </motion.div>
  )
}
