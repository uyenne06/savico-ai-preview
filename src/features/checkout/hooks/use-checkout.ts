'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { useRouter } from '@/i18n/navigation'
import {
  checkoutDoneRoute,
  checkoutFailedRoute,
  checkoutPaymentRoute,
  checkoutVerifyingRoute
} from '@/shared/constants/routes'
import { isApiError } from '@/shared/lib/api'
import { checkoutApi } from '../api/checkout.api'
import { checkoutKeys } from '../api/checkout.keys'
import type { CreateOrderPayload, Order } from '../types/checkout.types'

/**
 * Một đơn hàng.
 *
 * `refetchInterval` chỉ chạy khi đơn ĐANG CHỜ đối soát: màn "Đang xác nhận
 * chuyển khoản" (S06) phải tự cập nhật, còn đơn đã thanh toán hay đã hỏng thì
 * hỏi lại server mỗi 3 giây là gọi vô ích.
 */
interface UseOrderOptions {
  refetchIntervalMs?: number
}

export function useOrder(orderId: string, { refetchIntervalMs = 3_000 }: UseOrderOptions = {}) {
  return useQuery({
    queryKey: checkoutKeys.order(orderId),
    queryFn: () => checkoutApi.getOrder(orderId),
    enabled: Boolean(orderId),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'verifying' || status === 'awaiting' ? refetchIntervalMs : false
    },
    // Khách quét QR xong thường CHUYỂN SANG APP NGÂN HÀNG rồi mới quay lại —
    // lúc đó tab này ở nền. Mặc định TanStack Query dừng đếm khi mất focus, tức
    // là màn "đang xác nhận" đứng im đúng vào lúc tiền về. Bật chạy nền để đúng
    // như câu trên màn: "Bạn có thể giữ nguyên trang này".
    refetchIntervalInBackground: true
  })
}

interface UseCreateOrderOptions {
  beforeNavigate?: () => void | Promise<void>
}

/** "Tiến hành thanh toán" ở S03 → tạo đơn rồi mở màn QR (S04). */
export function useCreateOrder({ beforeNavigate }: UseCreateOrderOptions = {}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const t = useTranslations('errors')

  return useMutation({
    mutationFn: (payload: CreateOrderPayload) => checkoutApi.createOrder(payload),
    onSuccess: async (order) => {
      queryClient.setQueryData(checkoutKeys.order(order.id), order)
      await beforeNavigate?.()
      sessionStorage.setItem('savico.checkout.forward', 'payment')
      router.push(checkoutPaymentRoute(order.id))
    },
    onError: (error) => {
      toast.error(isApiError(error) ? error.message : t('generic'))
    }
  })
}

interface UseMarkTransferredOptions {
  beforeNavigate?: () => void | Promise<void>
}

/** "Tôi đã chuyển khoản" ở S04 → S06. */
export function useMarkTransferred(orderId: string, { beforeNavigate }: UseMarkTransferredOptions = {}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const t = useTranslations('errors')

  return useMutation({
    mutationFn: () => checkoutApi.markTransferred(orderId),
    onSuccess: async (order) => {
      queryClient.setQueryData(checkoutKeys.order(orderId), order)
      const verifyingStartedAt = order.verifyingStartedAt ? new Date(order.verifyingStartedAt).getTime() : Date.now()
      sessionStorage.setItem(`savico.checkout.verifying-start:${orderId}`, String(verifyingStartedAt))
      await beforeNavigate?.()
      sessionStorage.setItem('savico.checkout.forward', 'verifying')
      router.push(checkoutVerifyingRoute(orderId))
    },
    onError: (error) => {
      toast.error(isApiError(error) ? error.message : t('generic'))
    }
  })
}

interface UseRegenerateQrOptions {
  navigate?: boolean
  onSuccess?: (order: Order) => void
}

/** "Thử lại thanh toán" ở S07 / "Tạo lại mã" ở S04 → mã QR mới, quay về S04. */
export function useRegenerateQr(orderId: string, { navigate = true, onSuccess }: UseRegenerateQrOptions = {}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const t = useTranslations('errors')

  return useMutation({
    mutationFn: () => checkoutApi.regenerateQr(orderId),
    onSuccess: (order) => {
      queryClient.setQueryData(checkoutKeys.order(orderId), order)
      onSuccess?.(order)
      if (navigate) router.push(checkoutPaymentRoute(order.id))
    },
    onError: (error) => {
      toast.error(isApiError(error) ? error.message : t('generic'))
    }
  })
}

/**
 * Đưa người dùng về đúng màn của trạng thái đơn.
 *
 * Trạng thái đơn là nguồn sự thật duy nhất cho việc "đang ở bước nào": mở lại
 * link S04 của một đơn đã thanh toán thì phải thấy màn Hoàn tất, không phải một
 * mã QR đã chết.
 */
export function routeForStatus(order: Order): string {
  switch (order.status) {
    case 'awaiting':
      return checkoutPaymentRoute(order.id)
    case 'verifying':
      return checkoutVerifyingRoute(order.id)
    case 'failed':
      return checkoutFailedRoute(order.id)
    case 'paid':
      return checkoutDoneRoute(order.id)
  }
}
