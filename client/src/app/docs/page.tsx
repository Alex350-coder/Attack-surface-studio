import type { Metadata } from 'next'
import {
  FolderPlus,
  KeyRound,
  Network,
  PlayCircle,
  SearchCode,
  ShieldAlert,
  ShieldCheck,
  UserPlus,
  Waypoints,
} from 'lucide-react'
import { Navbar } from '@/components/marketing/Navbar'
import { InfoSection } from '@/components/marketing/InfoSection'
import { Footer } from '@/components/marketing/Footer'
import { getHasSession } from '@/lib/auth-cookies'

export const metadata: Metadata = {
  title: 'Docs — Attack Surface Studio',
}

const GETTING_STARTED_ITEMS = [
  {
    icon: UserPlus,
    title: '1. Create an account',
    description: 'Sign up and sign in to reach your workspace — every project and finding is scoped to your account.',
  },
  {
    icon: FolderPlus,
    title: '2. Create a project',
    description: 'A project holds the scope for one engagement: the domains and hosts you are authorized to assess.',
  },
  {
    icon: PlayCircle,
    title: '3. Run a tool',
    description: 'Queue a scan against your scope. Results are normalized and appear on the graph as they complete.',
  },
]

const ADAPTER_ITEMS = [
  {
    icon: SearchCode,
    title: 'Nmap',
    description: 'Host and service discovery — open ports, running services, and OS fingerprints become graph nodes.',
  },
  {
    icon: Network,
    title: 'ffuf',
    description: 'Content and subdomain fuzzing — discovered paths and hosts are linked back to the asset that owns them.',
  },
  {
    icon: ShieldAlert,
    title: 'Nuclei',
    description: 'Template-based vulnerability scanning — matches become findings, each carrying its own evidence.',
  },
]

const GRAPH_CONCEPT_ITEMS = [
  {
    icon: Waypoints,
    title: 'Nodes',
    description: 'Every discovered thing — a domain, host, port, service, finding, or piece of evidence — is a node.',
  },
  {
    icon: Network,
    title: 'Edges',
    description: 'Relationships between nodes: discovery, risk, evidence, and AI-derived connections.',
  },
  {
    icon: ShieldCheck,
    title: 'Metadata',
    description: 'Raw tool output stays attached to the node or edge it produced, so every fact is traceable to its source.',
  },
]

const SECURITY_ITEMS = [
  {
    icon: KeyRound,
    title: 'Authentication',
    description: 'Short-lived JWT access tokens with rotating refresh tokens; passwords are hashed with Argon2id.',
  },
  {
    icon: ShieldCheck,
    title: 'Scope enforcement',
    description: 'Tool runs are validated against your project scope before they are queued — nothing runs unscoped.',
  },
  {
    icon: ShieldAlert,
    title: 'Auditability',
    description: 'Raw tool output is retained alongside the normalized graph, so every finding can be traced and verified.',
  },
]

export default async function DocsPage() {
  const hasSession = await getHasSession()

  return (
    <div className="relative flex flex-1 flex-col">
      <Navbar isAuthenticated={hasSession} />
      <header className="relative z-10 mx-auto w-full max-w-3xl px-6 pb-4 pt-12 text-center sm:px-10">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent-strong)]">
          Documentation
        </span>
        <h1 className="mt-4 text-[length:var(--text-2xl)] font-semibold tracking-tight text-[var(--color-foreground)] sm:text-[length:var(--text-3xl)]">
          Everything you need to run your first assessment
        </h1>
        <p className="mt-4 text-[length:var(--text-base)] text-[var(--color-foreground-muted)]">
          Attack Surface Studio orchestrates security tools and turns their output into one living knowledge graph.
          Here is how the pieces fit together.
        </p>
      </header>
      <InfoSection
        eyebrow="Getting started"
        title="From sign-up to your first result"
        description="Three steps take you from a new account to a populated graph."
        items={GETTING_STARTED_ITEMS}
      />
      <InfoSection
        eyebrow="Tool adapters"
        title="Supported tools"
        description="Every adapter normalizes its tool's raw output into the same graph model — nodes, edges, and metadata."
        items={ADAPTER_ITEMS}
      />
      <InfoSection
        eyebrow="Knowledge graph"
        title="Three primitives, one model"
        description="Whatever the source — a tool run, a manual finding, an uploaded file — it becomes one of these."
        items={GRAPH_CONCEPT_ITEMS}
      />
      <InfoSection
        eyebrow="Security"
        title="Built for authorized engagements"
        description="Authentication, scope enforcement, and traceability are enforced at every step, not bolted on after."
        items={SECURITY_ITEMS}
      />
      <Footer />
    </div>
  )
}
