import { HeroSection } from '@/features/hero/HeroSection'
import { getHasSession } from '@/lib/auth-cookies'

export default async function Home() {
  const hasSession = await getHasSession()

  return <HeroSection hasSession={hasSession} />
}
