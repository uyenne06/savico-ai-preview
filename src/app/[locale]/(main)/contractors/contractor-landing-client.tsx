'use client'

import { ContractorLanding } from '@/features/contractors'
import { useDesignHandoff } from './use-design-handoff'

/** Bọc client cho S09 — nối trạng thái "đã có gói thiết kế" từ `features/design`. */
export function ContractorLandingClient() {
  const designHandoff = useDesignHandoff()
  return <ContractorLanding designHandoff={designHandoff} />
}
