import {
  Globe,
  Network,
  Hash,
  Server,
  Plug,
  Cpu,
  Layers,
  Monitor,
  Box,
  Cloud,
  Package,
  AlertTriangle,
  ShieldAlert,
  FileSearch,
  Camera,
  ArrowUpRight,
  ArrowDownLeft,
  FileText,
  StickyNote,
  Sparkles,
  type LucideIcon,
} from 'lucide-react'
import type { NodeCategory, NodeType, Severity } from '../../types/node.types'

export interface NodeTypeConfig {
  type: NodeType
  category: NodeCategory
  icon: LucideIcon
  colorToken: string
  glowIntensity: 'none' | 'subtle' | 'strong'
  defaultSeverity?: Severity
}

export const nodeTypeRegistry: Record<NodeType, NodeTypeConfig> = {
  domain: { type: 'domain', category: 'infrastructure', icon: Globe, colorToken: '--node-infrastructure', glowIntensity: 'subtle' },
  subdomain: { type: 'subdomain', category: 'infrastructure', icon: Network, colorToken: '--node-infrastructure', glowIntensity: 'subtle' },
  ip: { type: 'ip', category: 'infrastructure', icon: Hash, colorToken: '--node-infrastructure', glowIntensity: 'subtle' },
  host: { type: 'host', category: 'infrastructure', icon: Server, colorToken: '--node-infrastructure', glowIntensity: 'subtle' },
  port: { type: 'port', category: 'infrastructure', icon: Plug, colorToken: '--node-infrastructure', glowIntensity: 'subtle' },
  service: { type: 'service', category: 'infrastructure', icon: Cpu, colorToken: '--node-infrastructure', glowIntensity: 'subtle' },
  technology: { type: 'technology', category: 'infrastructure', icon: Layers, colorToken: '--node-infrastructure', glowIntensity: 'subtle' },
  os: { type: 'os', category: 'infrastructure', icon: Monitor, colorToken: '--node-infrastructure', glowIntensity: 'subtle' },
  container: { type: 'container', category: 'infrastructure', icon: Box, colorToken: '--node-infrastructure', glowIntensity: 'subtle' },
  cloud: { type: 'cloud', category: 'infrastructure', icon: Cloud, colorToken: '--node-infrastructure', glowIntensity: 'subtle' },
  asset: { type: 'asset', category: 'infrastructure', icon: Package, colorToken: '--node-infrastructure', glowIntensity: 'subtle' },

  finding: { type: 'finding', category: 'security', icon: AlertTriangle, colorToken: '--node-finding', glowIntensity: 'subtle', defaultSeverity: 'warning' },
  criticalFinding: { type: 'criticalFinding', category: 'security', icon: ShieldAlert, colorToken: '--node-critical', glowIntensity: 'strong', defaultSeverity: 'critical' },
  evidence: { type: 'evidence', category: 'security', icon: FileSearch, colorToken: '--node-evidence', glowIntensity: 'subtle', defaultSeverity: 'info' },

  screenshot: { type: 'screenshot', category: 'artifact', icon: Camera, colorToken: '--node-artifact', glowIntensity: 'none' },
  request: { type: 'request', category: 'artifact', icon: ArrowUpRight, colorToken: '--node-artifact', glowIntensity: 'none' },
  response: { type: 'response', category: 'artifact', icon: ArrowDownLeft, colorToken: '--node-artifact', glowIntensity: 'none' },
  report: { type: 'report', category: 'artifact', icon: FileText, colorToken: '--node-artifact', glowIntensity: 'subtle' },
  note: { type: 'note', category: 'artifact', icon: StickyNote, colorToken: '--node-artifact', glowIntensity: 'none' },

  aiInsight: { type: 'aiInsight', category: 'intelligence', icon: Sparkles, colorToken: '--node-intelligence', glowIntensity: 'subtle' },
}
