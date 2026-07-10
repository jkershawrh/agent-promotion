import { create } from 'zustand'

export type Mode = 'slides' | 'manual' | 'auto' | 'lab'
export type StepStatus = 'idle' | 'running' | 'done' | 'error'

interface DemoStore {
  mode: Mode
  slide: number
  actIndex: number
  gateStatus: StepStatus
  recordStatus: StepStatus
  evaluateStatus: StepStatus
  ratifyStatus: StepStatus
  demoteStatus: StepStatus

  setMode: (mode: Mode) => void
  setSlide: (n: number) => void
  nextSlide: () => void
  prevSlide: () => void
  setActIndex: (n: number) => void
  nextAct: () => void
  prevAct: () => void
  setStepStatus: (step: string, status: StepStatus) => void
  reset: () => void
}

export const TOTAL_SLIDES = 6
export const TOTAL_ACTS = 6

export const SLIDE_TITLES = [
  'Agent Promotion Line',
  'The Problem',
  'The Thesis',
  'Five Tiers',
  'Earn. Refuse. Revoke.',
  'Let Me Show You',
]

export const ACT_META = [
  { title: 'The Probation', subtitle: 'Day one. Advisory only.', next: 'The Gate' },
  { title: 'The Gate', subtitle: 'You do not hand the new hire the keys.', next: 'The Record' },
  { title: 'The Record', subtitle: 'Trust is a track record, not a title.', next: 'The Ratification' },
  { title: 'The Ratification', subtitle: 'You do not let people promote themselves into signing authority.', next: 'The Failure' },
  { title: 'The Failure', subtitle: 'What happens when someone you trusted screws up.', next: 'The Close' },
  { title: 'The Close', subtitle: 'The turn, stated whole.', next: '' },
]

export const useDemoStore = create<DemoStore>((set) => ({
  mode: 'slides',
  slide: 0,
  actIndex: 0,
  gateStatus: 'idle',
  recordStatus: 'idle',
  evaluateStatus: 'idle',
  ratifyStatus: 'idle',
  demoteStatus: 'idle',

  setMode: (mode) => set({ mode }),
  setSlide: (n) => set({ slide: Math.max(0, Math.min(n, TOTAL_SLIDES - 1)) }),
  nextSlide: () => set((s) => ({ slide: Math.min(s.slide + 1, TOTAL_SLIDES - 1) })),
  prevSlide: () => set((s) => ({ slide: Math.max(s.slide - 1, 0) })),
  setActIndex: (n) => set({ actIndex: Math.max(0, Math.min(n, TOTAL_ACTS - 1)) }),
  nextAct: () => set((s) => ({ actIndex: Math.min(s.actIndex + 1, TOTAL_ACTS - 1) })),
  prevAct: () => set((s) => ({ actIndex: Math.max(s.actIndex - 1, 0) })),
  setStepStatus: (step, status) => set({ [`${step}Status`]: status } as Partial<DemoStore>),
  reset: () => set({
    mode: 'slides',
    slide: 0,
    actIndex: 0,
    gateStatus: 'idle',
    recordStatus: 'idle',
    evaluateStatus: 'idle',
    ratifyStatus: 'idle',
    demoteStatus: 'idle',
  }),
}))
