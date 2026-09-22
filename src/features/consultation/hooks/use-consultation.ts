'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { isApiError } from '@/shared/lib/api'
import { consultationApi } from '../api/consultation.api'
import { consultationKeys } from '../api/consultation.keys'
import type { BookConsultationPayload } from '../types/consultation.types'

/** Danh sách kiến trúc sư của trang Tư vấn 1:1 (mục VIII.1). */
export function useConsultants() {
  return useQuery({
    queryKey: consultationKeys.consultants(),
    queryFn: () => consultationApi.listConsultants()
  })
}

export function useConsultant(consultantId: string) {
  return useQuery({
    queryKey: consultationKeys.consultantDetail(consultantId),
    queryFn: () => consultationApi.getConsultant(consultantId),
    enabled: Boolean(consultantId)
  })
}

/** Lịch trống 7 ngày của một KTS (mục VIII.2). */
export function useAvailability(consultantId: string) {
  return useQuery({
    queryKey: consultationKeys.availability(consultantId),
    queryFn: () => consultationApi.getAvailability(consultantId),
    enabled: Boolean(consultantId)
  })
}

/**
 * Xác nhận đặt lịch (mục VIII.3): toast góc phải trên rồi làm mới lịch để slot
 * vừa đặt chuyển sang "Kín". SMS xác nhận do backend gửi (mục VIII.4).
 */
export function useBookConsultation() {
  const queryClient = useQueryClient()
  const t = useTranslations('consult.booking')
  const tErrors = useTranslations('errors')

  return useMutation({
    mutationFn: (payload: BookConsultationPayload) => consultationApi.bookConsultation(payload),
    onSuccess: (booking) => {
      queryClient.invalidateQueries({ queryKey: consultationKeys.availability(booking.consultantId) })
      queryClient.invalidateQueries({ queryKey: consultationKeys.myBookings() })
      toast.success(t('successToast'))
    },
    onError: (error) => {
      toast.error(isApiError(error) ? error.message : tErrors('generic'))
    }
  })
}

/** Lịch sử tư vấn của người dùng đang đăng nhập. */
export function useMyConsultations() {
  return useQuery({
    queryKey: consultationKeys.myBookings(),
    queryFn: () => consultationApi.getMyBookings()
  })
}

/** Hủy lịch từ tab Tài khoản và làm mới danh sách ngay sau khi backend xác nhận. */
export function useCancelConsultation() {
  const queryClient = useQueryClient()
  const t = useTranslations('account.consultationHistory')
  const tErrors = useTranslations('errors')

  return useMutation({
    mutationFn: (bookingId: string) => consultationApi.cancelMyBooking(bookingId),
    onSuccess: (history) => {
      queryClient.setQueryData(consultationKeys.myBookings(), history)
      toast.success(t('cancel.success'))
    },
    onError: (error) => {
      toast.error(isApiError(error) ? error.message : tErrors('generic'))
    }
  })
}
