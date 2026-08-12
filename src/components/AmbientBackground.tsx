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
    <div className={cn('fixed inset-0 pointer-events-none overflow-hidden z-0 select-none', className)}>
      {/* ── Base Ambient Gradient ── */}
      <div
        className={cn(
          'absolute inset-0 transition-colors duration-700',
          preset === 'sunset'
            ? 'bg-gradient-to-br from-amber-50/90 via-rose-50/50 to-orange-100/60 dark:from-slate-950 dark:via-rose-950/20 dark:to-amber-950/30'
            : preset === 'grid'
            ? 'bg-slate-50/90 dark:bg-slate-950'
            : preset === 'minimal'
            ? 'bg-gradient-to-b from-background via-muted/30 to-background'
            : 'bg-gradient-to-br from-violet-50/80 via-background to-indigo-50/60 dark:from-slate-950 dark:via-purple-950/20 dark:to-slate-950'
        )}
      />

      {/* ── Glowing Aurora Gradient Mesh Orbs ── */}
      {(preset === 'aurora' || preset === 'sunset') && (
        <>
          {/* Top-Left Orb */}
          <motion.div
            animate={{
              x: [0, 40, -30, 0],
              y: [0, -40, 30, 0],
              scale: [1, 1.25, 0.85, 1],
            }}
            transition={{
              duration: 16,
              repeat: Infinity,
              repeatType: 'mirror',
              ease: 'easeInOut',
            }}
            className={cn(
              'absolute -top-32 -left-32 h-[36rem] w-[36rem] rounded-full blur-[100px] transition-colors',
              preset === 'sunset'
                ? 'bg-amber-400/40 dark:bg-amber-500/30'
                : 'bg-violet-400/45 dark:bg-violet-600/35'
            )}
          />

          {/* Top-Right Orb */}
          <motion.div
            animate={{
              x: [0, -50, 30, 0],
              y: [0, 45, -30, 0],
              scale: [1, 0.85, 1.25, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              repeatType: 'mirror',
              ease: 'easeInOut',
            }}
            className={cn(
              'absolute -top-24 -right-32 h-[40rem] w-[40rem] rounded-full blur-[110px] transition-colors',
              preset === 'sunset'
                ? 'bg-rose-400/40 dark:bg-rose-600/30'
                : 'bg-indigo-400/40 dark:bg-indigo-600/35'
            )}
          />

          {/* Bottom-Center Orb */}
          <motion.div
            animate={{
              x: [0, 35, -45, 0],
              y: [0, -35, 40, 0],
              scale: [1, 1.15, 0.9, 1],
            }}
            transition={{
              duration: 24,
              repeat: Infinity,
              repeatType: 'mirror',
              ease: 'easeInOut',
            }}
            className={cn(
              'absolute -bottom-48 left-1/2 -translate-x-1/2 h-[44rem] w-[44rem] rounded-full blur-[120px] transition-colors',
              preset === 'sunset'
                ? 'bg-orange-400/30 dark:bg-amber-600/25'
                : 'bg-pink-400/35 dark:bg-purple-600/30'
            )}
          />
        </>
      )}

      {/* ── Geometric Dot Grid Matrix Overlay ── */}
      {(preset === 'aurora' || preset === 'grid') && (
        <div
          className="absolute inset-0 opacity-[0.15] dark:opacity-[0.25]"
          style={{
            backgroundImage: `radial-gradient(currentColor 1.2px, transparent 1.2px)`,
            backgroundSize: '24px 24px',
            maskImage: 'radial-gradient(ellipse 90% 90% at 50% 30%, black 50%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 90% 90% at 50% 30%, black 50%, transparent 100%)',
          }}
        />
      )}

      {/* ── Engineering Grid lines for 'grid' preset ── */}
      {preset === 'grid' && (
        <div
          className="absolute inset-0 opacity-[0.08] dark:opacity-[0.15]"
          style={{
            backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
      )}
    </div>
  )
}
