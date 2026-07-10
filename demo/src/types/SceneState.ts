// CDD: Scene controller state. No logic.

import type { AgentAuthority, RosterEntry, AuthorityDecision, RatificationRequest } from './ApiTypes'

export type LayerId = 'hook' | 'earn' | 'depth' | 'floor' | 'close'

export interface LayerMeta {
  id: LayerId
  index: number
  title: string
  subtitle: string
  humorBeat: string
  turn: string
  keyboardShortcut: string
}

export const LAYERS: LayerMeta[] = [
  {
    id: 'hook',
    index: 0,
    title: 'The Hook',
    subtitle: 'You do not hand the new hire the keys.',
    humorBeat: 'Very keen. Not yet allowed near anything important.',
    turn: 'A human new hire on day one might still grab the keys if nobody is looking. This one physically cannot.',
    keyboardShortcut: '0',
  },
  {
    id: 'earn',
    index: 1,
    title: 'The Earn',
    subtitle: 'Trust is a track record, not a title.',
    humorBeat: 'Unlike the new hire who thinks two good weeks means they run the place, this one has to actually hit the number.',
    turn: "A person's promotion is often a manager's gut feel. This one has receipts.",
    keyboardShortcut: '1',
  },
  {
    id: 'depth',
    index: 2,
    title: 'The Depth',
    subtitle: 'You do not let people promote themselves into signing authority.',
    humorBeat: 'Nice try. Even here, it does not get to grade its own promotion.',
    turn: 'A person can quietly exceed the authority you gave them. This one cannot.',
    keyboardShortcut: '2',
  },
  {
    id: 'floor',
    index: 3,
    title: 'The Floor',
    subtitle: 'What happens when someone you trusted screws up.',
    humorBeat: 'Unlike a certain colleague, it cannot blame the intern. The whole thing is on the record.',
    turn: 'A person who fails might hide it. This one is demoted before it finishes happening.',
    keyboardShortcut: '3',
  },
  {
    id: 'close',
    index: 4,
    title: 'The Close',
    subtitle: 'The turn, stated whole.',
    humorBeat: '',
    turn: 'I can trust it the way I would trust a good employee, except it cannot exceed its authority, cannot hide a mistake, and cannot have a bad day.',
    keyboardShortcut: '4',
  },
]

export type ScenePhase = 'idle' | 'seeding' | 'running' | 'paused' | 'complete'

export interface SceneState {
  currentLayer: LayerId
  phase: ScenePhase
  agentId: string
  authority: AgentAuthority | null
  lastGateDecision: AuthorityDecision | null
  pendingRatification: RatificationRequest | null
  roster: RosterEntry[]
  navigationHistory: LayerId[]
}

export const INITIAL_SCENE_STATE: SceneState = {
  currentLayer: 'hook',
  phase: 'idle',
  agentId: 'ops-agent',
  authority: null,
  lastGateDecision: null,
  pendingRatification: null,
  roster: [],
  navigationHistory: [],
}
