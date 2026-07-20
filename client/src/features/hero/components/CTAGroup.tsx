import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function CTAGroup() {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <Button size="lg">
        Request access
        <ArrowRight size={16} />
      </Button>
      <Button variant="ghost" size="lg">
        Explore the graph engine
      </Button>
    </div>
  )
}
