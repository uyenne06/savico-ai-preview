/**
 * Public API của feature `contractors` — luồng TÌM NHÀ THẦU (S09–S18).
 *
 * Hai quy tắc đi xuyên suốt feature này: mỗi dự án mời tối đa 3 nhà thầu (R1) và
 * web không hiển thị báo giá của nhà thầu (R2).
 */
export { BriefForm } from './components/brief-form'
export { BriefReview } from './components/brief-review'
export { AccountDossierList } from './components/account-dossier-list'
export { ContractorCompare } from './components/contractor-compare'
export { ContractorLanding } from './components/contractor-landing'
export { ContractorMatches } from './components/contractor-matches'
export { ContractorProfile } from './components/contractor-profile'
export { InvitationTracker } from './components/invitation-tracker'
export { InviteSent } from './components/invite-sent'
export { ProjectContextBar } from './components/project-context-bar'
export { SurveyScheduler } from './components/survey-scheduler'

export { CONTRACTOR_TABS, MAX_INVITATIONS, type ContractorTab } from './constants/contractors.constants'
export { useBrief, useCreateBrief } from './hooks/use-brief'
export { useInvitations } from './hooks/use-invitations'
export type { Contractor, Invitation, ProjectBrief } from './types/contractor.types'
