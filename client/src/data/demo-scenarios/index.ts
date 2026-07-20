import { externalAttackSurface } from './external-attack-surface'
import { internalInfrastructure } from './internal-infrastructure'
import { securityInvestigation } from './security-investigation'
import type { DemoScenario } from './scenario.types'

export const demoScenarios: DemoScenario[] = [externalAttackSurface, internalInfrastructure, securityInvestigation]

export function getRandomScenario(): DemoScenario {
  const index = Math.floor(Math.random() * demoScenarios.length)
  return demoScenarios[index]
}

export type { DemoScenario }
