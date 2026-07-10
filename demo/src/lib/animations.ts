import type { Variants } from 'framer-motion'

export const promoteVariants: Variants = {
  initial: { y: 0, scale: 1, opacity: 1 },
  promote: {
    y: -60,
    scale: [1, 1.2, 1],
    opacity: 1,
    transition: { duration: 0.8, ease: 'easeOut' },
  },
}

export const demoteVariants: Variants = {
  initial: { y: 0, scale: 1, opacity: 1 },
  demote: {
    y: 60,
    scale: [1, 0.9, 1],
    opacity: [1, 0.6, 1],
    transition: { duration: 0.6, ease: 'easeIn' },
  },
}

export const refuseVariants: Variants = {
  initial: { x: 0, borderColor: 'rgba(239, 68, 68, 0)' },
  refuse: {
    x: [0, -8, 8, -6, 6, -3, 3, 0],
    borderColor: ['rgba(239, 68, 68, 0)', 'rgba(239, 68, 68, 1)', 'rgba(239, 68, 68, 0)'],
    transition: { duration: 0.5 },
  },
}

export const allowVariants: Variants = {
  initial: { scale: 1, boxShadow: '0 0 0 0 rgba(34, 197, 94, 0)' },
  allow: {
    scale: [1, 1.05, 1],
    boxShadow: [
      '0 0 0 0 rgba(34, 197, 94, 0)',
      '0 0 0 8px rgba(34, 197, 94, 0.3)',
      '0 0 0 0 rgba(34, 197, 94, 0)',
    ],
    transition: { duration: 0.6 },
  },
}

export const routeHumanVariants: Variants = {
  initial: { scale: 1, borderColor: 'rgba(245, 158, 11, 0)' },
  route: {
    scale: [1, 1.03, 1],
    borderColor: ['rgba(245, 158, 11, 0)', 'rgba(245, 158, 11, 1)', 'rgba(245, 158, 11, 0.5)'],
    transition: { duration: 0.8, repeat: 1 },
  },
}

export const chainFillVariants: Variants = {
  initial: { width: '0%' },
  fill: (accuracy: number) => ({
    width: `${accuracy * 100}%`,
    transition: { duration: 1.5, ease: 'easeOut' },
  }),
}

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.3 } },
}

export const staggerContainer: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.1 } },
}

export const TIER_COLORS: Record<string, string> = {
  T0: '#6b7280',
  T1: '#3b82f6',
  T2: '#8b5cf6',
  T3: '#f59e0b',
  T4: '#ef4444',
}
