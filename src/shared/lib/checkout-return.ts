const CHECKOUT_RETURN_KEY = 'savico.checkout.return'
const CHECKOUT_RETURN_TTL_MS = 30 * 60 * 1000

interface CheckoutReturnMarker {
  productId: string
  projectId?: string
  at: number
}

export function rememberCheckoutReturn(productId: string, projectId?: string) {
  if (typeof window === 'undefined') return
  const marker: CheckoutReturnMarker = { productId, ...(projectId ? { projectId } : {}), at: Date.now() }
  sessionStorage.setItem(CHECKOUT_RETURN_KEY, JSON.stringify(marker))
}

export function canReturnToCheckoutSource(productId: string, projectId?: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    const raw = sessionStorage.getItem(CHECKOUT_RETURN_KEY)
    if (!raw) return false
    const marker = JSON.parse(raw) as CheckoutReturnMarker
    return (
      marker.productId === productId &&
      (marker.projectId ?? '') === (projectId ?? '') &&
      Date.now() - marker.at <= CHECKOUT_RETURN_TTL_MS
    )
  } catch {
    return false
  }
}

export function clearCheckoutReturn() {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(CHECKOUT_RETURN_KEY)
}
