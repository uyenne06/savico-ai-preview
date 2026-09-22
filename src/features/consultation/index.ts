/**
 * Public API of the `consultation` feature — Tư vấn 1:1 (mục VIII):
 * danh sách kiến trúc sư, hồ sơ KTS kèm khối chọn khung giờ, modal xác nhận đặt
 * lịch, và section KTS ghim ở trang chủ (mục III.2).
 */
export { ConsultantDirectory } from './components/consultant-directory'
export { ConsultantDetail } from './components/consultant-detail'
export { ConsultantCard } from './components/consultant-card'
export { ConsultantHighlights } from './components/consultant-highlights'
export { ConsultationHistory } from './components/consultation-history'
export { ConsultTransitionStateProvider } from './components/consult-transition-state'
export {
  useConsultants,
  useConsultant,
  useAvailability,
  useBookConsultation,
  useMyConsultations,
  useCancelConsultation
} from './hooks/use-consultation'
export {
  filterConsultants,
  findMatchRange,
  sortConsultants,
  specialtyOptions,
  sessionSlots,
  firstOpenDay,
  parseDateKey,
  slotEndTime,
  type ConsultantFilter
} from './services/consultation.service'
export { createBookingSchema, BOOKING_NOTE_MAX_LENGTH, type BookingFormValues } from './schemas/booking.schema'
export {
  AVAILABILITY_DAYS,
  SESSION_TIMES,
  SLOT_MINUTES,
  HOME_CONSULTANT_COUNT
} from './constants/consultation.constants'
export type {
  BookConsultationPayload,
  Consultant,
  ConsultantSpecialty,
  ConsultantWork,
  ConsultationBooking,
  ConsultationBookingStatus,
  ConsultationHistoryBooking,
  ConsultationHistoryStatus,
  ConsultationDay,
  ConsultationSession,
  ConsultationSlot
} from './types/consultation.types'
