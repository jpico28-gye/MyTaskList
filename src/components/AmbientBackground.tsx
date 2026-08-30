'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export type BackgroundPreset = 'aurora' | 'grid' | 'sunset' | 'minimal' | 'obsidian'

interface AmbientBackgroundProps {
  preset?: BackgroundPreset
  className?: string
}

export default function AmbientBackground({ preset = 'minimal', className }: AmbientBackgroundProps) {
  return (
    <div className={cn('fixed inset-0 pointer-events-none overflow-hidden z-0 select-none', className)}>
      {/* ── Base Ambient Gradient ── */}
      <div
        className={cn(
          'absolute inset-0 transition-colors duration-700',
          preset === 'obsidian'
            ? 'bg-slate-950 dark:bg-black'
            : preset === 'sunset'
            ? 'bg-gradient-to-br from-amber-50/90 via-rose-50/50 to-orange-100/60 dark:from-slate-950 dark:via-rose-950/20 dark:to-amber-950/30'
            : preset === 'grid'
            ? 'bg-slate-900 dark:bg-slate-950'
            : preset === 'minimal'
            ? 'bg-slate-100/80 dark:bg-slate-950'
            : 'bg-gradient-to-br from-violet-50/80 via-background to-indigo-50/60 dark:from-slate-950 dark:via-purple-950/20 dark:to-slate-950'
        )}
      />

      {/* ── Subtle Ambient Glow for Minimal / Obsidian ── */}
      {(preset === 'minimal' || preset === 'obsidian') && (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.12),rgba(255,255,255,0))]" />
      )}

      {/* ── Glowing Aurora Gradient Mesh Orbs (Only for Aurora / Sunset) ── */}
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
              duration: 20,
              repeat: Infinity,
              repeatType: 'mirror',
              ease: 'easeInOut',
            }}
            className={cn(
              'absolute -top-32 -left-32 h-[36rem] w-[36rem] rounded-full blur-[120px] opacity-25 transition-colors',
              preset === 'sunset'
                ? 'bg-amber-400 dark:bg-amber-500'
                : 'bg-violet-400 dark:bg-violet-600'
            )}
          />

          {/* Top-Right Orb */}
          <motion.div
            animate={{
              x: [0, -40, 20, 0],
              y: [0, 35, -20, 0],
              scale: [1, 0.9, 1.15, 1],
            }}
            transition={{
              duration: 24,
              repeat: Infinity,
              repeatType: 'mirror',
              ease: 'easeInOut',
            }}
            className={cn(
              'absolute -top-24 -right-32 h-[40rem] w-[40rem] rounded-full blur-[130px] opacity-20 transition-colors',
              preset === 'sunset'
                ? 'bg-rose-400 dark:bg-rose-600'
                : 'bg-indigo-400 dark:bg-indigo-600'
            )}
          />
        </>
      )}

      {/* ── Geometric Dot Grid Matrix Overlay ── */}
      {(preset === 'aurora' || preset === 'grid' || preset === 'minimal') && (
        <div
          className="absolute inset-0 opacity-[0.06] dark:opacity-[0.12]"
          style={{
            backgroundImage: `radial-gradient(currentColor 1.2px, transparent 1.2px)`,
            backgroundSize: '28px 28px',
            maskImage: 'radial-gradient(ellipse 90% 90% at 50% 30%, black 40%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 90% 90% at 50% 30%, black 40%, transparent 100%)',
          }}
        />
      )}

      {/* ── Engineering Grid lines for 'grid' preset ── */}
      {preset === 'grid' && (
        <div
          className="absolute inset-0 opacity-[0.05] dark:opacity-[0.10]"
          style={{
            backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
            backgroundSize: '48px 48px',
          }}
        />
      )}
    </div>
  )
}
