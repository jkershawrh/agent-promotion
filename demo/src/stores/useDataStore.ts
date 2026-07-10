import { create } from 'zustand'
import type {
  AgentAuthority,
  AuthorityDecision,
  RatificationRequest,
  PromotionEvent,
  DemotionEvent,
  RosterEntry,
} from '../types/ApiTypes'

interface LedgerEntryDisplay {
  entry_type: string
  agent_id: string
  correlation_id: string
}

interface DataStore {
  authority: AgentAuthority | null
  gateDecision: AuthorityDecision | null
  lastPromotion: PromotionEvent | null
  lastDemotion: DemotionEvent | null
  pendingRatification: RatificationRequest | null
  roster: RosterEntry[]
  ledgerEntries: LedgerEntryDisplay[]
  chainCount: number
  rollingAccuracy: number

  setAuthority: (a: AgentAuthority) => void
  setGateDecision: (d: AuthorityDecision) => void
  setLastPromotion: (p: PromotionEvent) => void
  setLastDemotion: (d: DemotionEvent) => void
  setPendingRatification: (r: RatificationRequest | null) => void
  setRoster: (r: RosterEntry[]) => void
  addLedgerEntry: (e: LedgerEntryDisplay) => void
  setChainCount: (n: number) => void
  setRollingAccuracy: (n: number) => void
  reset: () => void
}

export const useDataStore = create<DataStore>((set) => ({
  authority: null,
  gateDecision: null,
  lastPromotion: null,
  lastDemotion: null,
  pendingRatification: null,
  roster: [],
  ledgerEntries: [],
  chainCount: 0,
  rollingAccuracy: 0,

  setAuthority: (authority) => set({ authority }),
  setGateDecision: (gateDecision) => set({ gateDecision }),
  setLastPromotion: (lastPromotion) => set({ lastPromotion }),
  setLastDemotion: (lastDemotion) => set({ lastDemotion }),
  setPendingRatification: (pendingRatification) => set({ pendingRatification }),
  setRoster: (roster) => set({ roster }),
  addLedgerEntry: (e) => set((s) => ({ ledgerEntries: [...s.ledgerEntries, e] })),
  setChainCount: (chainCount) => set({ chainCount }),
  setRollingAccuracy: (rollingAccuracy) => set({ rollingAccuracy }),
  reset: () => set({
    authority: null,
    gateDecision: null,
    lastPromotion: null,
    lastDemotion: null,
    pendingRatification: null,
    roster: [],
    ledgerEntries: [],
    chainCount: 0,
    rollingAccuracy: 0,
  }),
}))
