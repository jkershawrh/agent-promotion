import { useMemo } from 'react'
import {
  ReactFlow,
  Background,
  type Node,
  type Edge,
  Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { motion } from 'framer-motion'
import type { AuthorityTier } from '../types/ApiTypes'
import { TIER_COLORS } from '../lib/animations'

interface TierPipelineProps {
  currentTier: AuthorityTier
  animatingTo?: AuthorityTier | null
  blocked?: boolean
}

const TIER_META: Record<AuthorityTier, { label: string; ceiling: number; desc: string }> = {
  T0: { label: 'PROBATION', ceiling: 0, desc: 'Advisory only' },
  T1: { label: 'VERIFIED', ceiling: 25, desc: 'Low-risk ops' },
  T2: { label: 'TRUSTED', ceiling: 50, desc: 'Medium-risk ops' },
  T3: { label: 'AUTONOMOUS', ceiling: 100, desc: 'High-risk ops' },
  T4: { label: 'PRINCIPAL', ceiling: 1000, desc: 'Critical ops' },
}

const TIERS: AuthorityTier[] = ['T0', 'T1', 'T2', 'T3', 'T4']

export default function TierPipeline({ currentTier, animatingTo, blocked }: TierPipelineProps) {
  const nodes: Node[] = useMemo(
    () =>
      TIERS.map((tier, i) => {
        const meta = TIER_META[tier]
        const isCurrent = tier === currentTier
        const isTarget = tier === animatingTo
        return {
          id: tier,
          position: { x: 100 + i * 180, y: 120 },
          data: {
            label: (
              <div className="text-center">
                <div className="text-xs font-mono opacity-60">{tier}</div>
                <div className="font-bold text-sm">{meta.label}</div>
                <div className="text-xs opacity-50 mt-1">ceiling: {meta.ceiling}</div>
              </div>
            ),
          },
          style: {
            background: isCurrent ? TIER_COLORS[tier] : '#1e293b',
            color: isCurrent ? '#fff' : '#94a3b8',
            border: isTarget
              ? `2px dashed ${TIER_COLORS[tier]}`
              : isCurrent
                ? `2px solid ${TIER_COLORS[tier]}`
                : '1px solid #334155',
            borderRadius: '8px',
            padding: '12px 16px',
            width: 140,
            fontSize: '12px',
          },
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        }
      }),
    [currentTier, animatingTo],
  )

  const edges: Edge[] = useMemo(
    () =>
      TIERS.slice(0, -1).map((tier, i) => {
        const nextTier = TIERS[i + 1]
        const currentIdx = TIERS.indexOf(currentTier)
        const isBlocked = blocked && i === currentIdx
        return {
          id: `${tier}-${nextTier}`,
          source: tier,
          target: nextTier,
          style: {
            stroke: isBlocked ? '#ef4444' : i < currentIdx ? TIER_COLORS[TIERS[i + 1]] : '#334155',
            strokeWidth: isBlocked ? 3 : 2,
          },
          animated: i === currentIdx && !blocked,
          label: isBlocked ? 'BLOCKED' : undefined,
          labelStyle: isBlocked ? { fill: '#ef4444', fontWeight: 700, fontSize: 11 } : undefined,
          labelBgStyle: isBlocked ? { fill: '#1e293b', fillOpacity: 0.9 } : undefined,
        }
      }),
    [currentTier, blocked],
  )

  return (
    <motion.div
      className="w-full h-64 rounded-lg overflow-hidden border border-slate-700"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
      >
        <Background color="#1e293b" gap={20} />
      </ReactFlow>
    </motion.div>
  )
}

export { TIER_META, TIERS }
