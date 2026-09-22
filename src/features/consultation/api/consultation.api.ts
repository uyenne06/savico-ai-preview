import { env } from '@/shared/config/env'
import { http } from '@/shared/lib/api'
import type {
  BookConsultationPayload,
  Consultant,
  ConsultationBooking,
  ConsultationHistory,
  ConsultationDay
} from '../types/consultation.types'
import { mockConsultationApi } from './consultation.mock'

/**
 * Tư vấn 1:1 (mục VIII). Hồ sơ KTS và lịch làm việc do admin quản lý (mục X, #5)
 * nên phía khách chỉ đọc; write duy nhất là đặt lịch.
 *
 * Đặt lịch thành công backend còn gửi SMS cho khách và báo lịch mới cho KTS /
 * quản trị (mục VIII.4) — phần đó nằm ngoài frontend.
 */
const ConsultationApi = {
  listConsultants: () => http.get<Consultant[]>('/consultants'),

  getConsultant: (id: string) => http.get<Consultant | null>(`/consultants/${id}`),

  /** Lịch trống 7 ngày tới, đã đánh dấu slot kín (mục VIII.2). */
  getAvailability: (consultantId: string) => http.get<ConsultationDay[]>(`/consultants/${consultantId}/availability`),

  bookConsultation: (payload: BookConsultationPayload) => http.post<ConsultationBooking>('/consultations', payload),

  /** Lịch sử và hạn mức tư vấn của tài khoản hiện tại. */
  getMyBookings: () => http.get<ConsultationHistory>('/me/consultations'),

  /** Khách tự hủy lịch; backend quyết định có hoàn lượt theo mốc 24 giờ hay không. */
  cancelMyBooking: (bookingId: string) => http.patch<ConsultationHistory>(`/me/consultations/${bookingId}/cancel`, {})
}

export const consultationApi = env.NEXT_PUBLIC_USE_MOCK_API ? mockConsultationApi : ConsultationApi
