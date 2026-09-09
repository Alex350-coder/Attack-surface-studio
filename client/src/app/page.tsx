import { cookies } from 'next/headers'
import { HeroSection } from '@/features/hero/HeroSection'
import { REFRESH_TOKEN_COOKIE } from '@/lib/auth-cookies'

export default async function Home() {
  const cookieStore = await cookies()
  const hasSession = cookieStore.has(REFRESH_TOKEN_COOKIE)

  return <HeroSection hasSession={hasSession} />
}
