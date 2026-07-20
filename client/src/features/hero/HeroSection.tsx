'use client'

import { useRef } from 'react'
import dynamic from 'next/dynamic'
import { FileText, Search, Share2, ShieldCheck, Users, Zap } from 'lucide-react'
import { Navbar } from './components/Navbar'
import { HeroContent } from './components/HeroContent'
import { CTAGroup } from './components/CTAGroup'
import { GraphStage } from './components/GraphStage'
import { InfoSection } from './components/InfoSection'
import { Footer } from './components/Footer'
import { BackgroundLayer } from './background/BackgroundLayer'

const GraphPreview = dynamic(() => import('./components/GraphPreview'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)]" />
  ),
})

const PLATFORM_ITEMS = [
  {
    icon: Search,
    title: 'Continuous discovery',
    description:
      'Domains, subdomains, hosts, and services are enumerated and linked automatically as your surface changes.',
  },
  {
    icon: Share2,
    title: 'Contextual correlation',
    description:
      'Findings, evidence, and AI insights attach directly to the assets they affect — no disconnected spreadsheets.',
  },
  {
    icon: ShieldCheck,
    title: 'Evidence-backed findings',
    description: 'Every critical finding carries its evidence trail, so triage starts with proof, not guesswork.',
  },
]

const HOW_IT_WORKS_ITEMS = [
  {
    icon: Zap,
    title: 'Real-time updates',
    description: 'New assets and findings animate into the graph the moment they are discovered.',
  },
  {
    icon: Users,
    title: 'Built for teams',
    description: 'Security engineers and analysts share one live view instead of static reports.',
  },
  {
    icon: FileText,
    title: 'Audit-ready reporting',
    description: 'Generate a timeline of the investigation directly from the graph, evidence included.',
  },
]

export function HeroSection() {
  const graphStageRef = useRef<HTMLDivElement>(null)

  return (
    <div className="relative flex flex-1 flex-col">
      <BackgroundLayer focusRef={graphStageRef} />
      <Navbar />
      <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center gap-10 px-6 py-16 text-center sm:px-10 lg:py-24">
        <HeroContent />
        <CTAGroup />
      </main>
      <div className="relative z-10 mx-auto w-full max-w-[1600px] px-6 py-[var(--space-section)] sm:px-10">
        <GraphStage containerRef={graphStageRef}>
          <GraphPreview />
        </GraphStage>
      </div>
      <InfoSection
        eyebrow="Platform"
        title="One graph, every signal"
        description="Every asset, finding, and piece of evidence lives on the same canvas — so context never gets lost between tools."
        items={PLATFORM_ITEMS}
      />
      <InfoSection
        eyebrow="How it works"
        title="From signal to story"
        description="Watch an investigation unfold in real time, from the first discovered asset to the final report."
        items={HOW_IT_WORKS_ITEMS}
      />
      <Footer />
    </div>
  )
}
