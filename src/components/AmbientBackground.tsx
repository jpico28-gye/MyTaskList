'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export type BackgroundPreset = 'aurora' | 'grid' | 'sunset' | 'minimal'

interface AmbientBackgroundProps {
  preset?: BackgroundPreset
  className?: string
}

export default function AmbientBackground({ preset = 'aurora', className }: AmbientBackgroundProps) {
  return (
    <div className={cn('fixed inset-0 pointer-events-none overflow-hidden -z-10 select-none', className)}>
      {/* ── Aurora Mesh Gradient Orbs ── */}
      {(preset === 'aurora' || preset === 'sunset') && (
        <>
          {/* Top-Left Orb */}
          <motion.div
            animate={{
              x: [0, 30, -20, 0],
              y: [0, -30, 20, 0],
              scale: [1, 1.15, 0.9, 1],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              repeatType: 'mirror',
              ease: 'easeInOut',
            }}
            className={cn(
              'absolute -top-32 -left-32 h-[30rem] w-[30rem] rounded-full blur-[110px] opacity-70 transition-colors',
              preset === 'sunset'
                ? 'bg-amber-400/25 dark:bg-amber-600/20'
                : 'bg-violet-500/20 dark:bg-violet-600/25'
            )}
          />

          {/* Top-Right Orb */}
          <motion.div
            animate={{
              x: [0, -40, 25, 0],
              y: [0, 35, -25, 0],
              scale: [1, 0.9, 1.2, 1],
            }}
            transition={{
              duration: 22,
              repeat: Infinity,
              repeatType: 'mirror',
              ease: 'easeInOut',
            }}
            className={cn(
              'absolute -top-20 -right-32 h-[34rem] w-[34rem] rounded-full blur-[120px] opacity-60 transition-colors',
              preset === 'sunset'
                ? 'bg-rose-500/20 dark:bg-rose-600/20'
                : 'bg-indigo-500/20 dark:bg-indigo-600/25'
            )}
          />

          {/* Bottom-Center Orb */}
          <motion.div
            animate={{
              x: [0, 25, -35, 0],
              y: [0, -25, 30, 0],
              scale: [1, 1.1, 0.95, 1],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              repeatType: 'mirror',
              ease: 'easeInOut',
            }}
            className={cn(
              'absolute -bottom-40 left-1/2 -translate-x-1/2 h-[36rem] w-[36rem] rounded-full blur-[130px] opacity-50 transition-colors',
              preset === 'sunset'
                ? 'bg-orange-500/15 dark:bg-amber-500/15'
                : 'bg-pink-500/15 dark:bg-purple-600/20'
            )}
          />
        </>
      )}

      {/* ── Geometric Grid Pattern Overlay ── */}
      {(preset === 'aurora' || preset === 'grid') && (
        <div
          className="absolute inset-0 opacity-[0.035] dark:opacity-[0.07]"
          style={{
            backgroundImage: `radial-gradient(currentColor 1px, transparent 1px)`,
            backgroundSize: '24px 24px',
            maskImage: 'radial-gradient(ellipse 80% 80% at 50% 30%, black 40%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 80% at 50% 30%, black 40%, transparent 100%)',
          }}
        />
      )}

      {/* ── Grid lines for 'grid' preset ── */}
      {preset === 'grid' && (
        <div
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]"
          style={{
            backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />
      )}

      {/* ── Soft Vignette Overlay ── */}
      <div className="absolute inset-0 bg-radial from-transparent via-transparent to-background/50 pointer-events-none" />
    </div>
  )
}
