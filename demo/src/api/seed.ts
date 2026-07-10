import type { LayerId } from '../types/SceneState'
import { getAuthority } from './client'

export interface SeedResult {
  agentId: string
  layer: LayerId
  success: boolean
  message: string
}

export async function seedLayer(layer: LayerId, agentId: string = 'ops-agent'): Promise<SeedResult> {
  try {
    switch (layer) {
      case 'hook':
        await getAuthority(agentId)
        return { agentId, layer, success: true, message: 'Agent registered at T0' }

      case 'earn':
        await getAuthority(agentId)
        return { agentId, layer, success: true, message: 'Agent ready for earn (seed chains via service)' }

      case 'depth':
        await getAuthority(agentId)
        return { agentId, layer, success: true, message: 'Agent ready for depth (seed chains via service)' }

      case 'floor':
        await getAuthority(agentId)
        return { agentId, layer, success: true, message: 'Agent ready for floor (seed chains via service)' }

      case 'close':
        return { agentId, layer, success: true, message: 'Close layer (roster view)' }

      default:
        return { agentId, layer, success: false, message: `Unknown layer: ${layer}` }
    }
  } catch (e) {
    return {
      agentId,
      layer,
      success: false,
      message: e instanceof Error ? e.message : 'Unknown error',
    }
  }
}

export async function resetDemo(): Promise<boolean> {
  // The service uses module-level state. A full reset requires restarting the service
  // or adding a reset endpoint. For the demo, we restart via the service manager.
  // For now, return true as a placeholder.
  return true
}

export const DEMO_AGENT_ID = 'ops-agent'

export const DEMO_ACTIONS = {
  lowRisk: { action_id: 'restart-logging-pod', consequence_score: 10, label: 'Restart logging pod' },
  mediumRisk: { action_id: 'scale-frontend', consequence_score: 30, label: 'Scale frontend service' },
  highRisk: { action_id: 'failover-region-east', consequence_score: 100, label: 'Failover region east' },
  critical: { action_id: 'migrate-production-db', consequence_score: 500, label: 'Migrate production database' },
}
