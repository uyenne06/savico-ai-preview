/**
 * Public API of the `account` feature — Cửa sổ cá nhân (mục IV).
 * "Dự án của tôi" lives in `features/design` because it reads project state;
 * the account page composes both.
 */
export { AccountInfo } from './components/account-info'
export { FavoriteGrid } from './components/favorite-grid'
export { PlanCard } from './components/plan-card'
export { PurchaseHistory } from './components/purchase-history'
export { useAccountPlan } from './hooks/use-account-plan'
export { usePurchaseHistory } from './hooks/use-purchase-history'
export type { AccountPlan, AccountPurchaseHistory, PlanAllowance } from './types/account.types'
