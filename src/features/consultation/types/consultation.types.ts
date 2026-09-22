/**
 * Kiểu dữ liệu của Tư vấn 1:1 (mục VIII).
 *
 * Hồ sơ kiến trúc sư là nội dung admin biên soạn (mục X, #5) nên type nằm ở
 * `shared/cms`; lịch trống và lịch hẹn thì thuộc về feature này.
 */
export type { Consultant, ConsultantSpecialty, ConsultantWork } from '@/shared/cms'

/** Hai hàng khung giờ của khối "CHỌN KHUNG GIỜ TƯ VẤN" (mục VIII.2). */
export type ConsultationSession = 'morning' | 'afternoon'

/**
 * Một khung giờ 30 phút. `full` = đã kín chỗ: hiện chữ "Kín", mờ, không bấm được.
 */
export interface ConsultationSlot {
  /** `{date}-{time}`, ví dụ `2026-08-04-09:00`. */
  id: string
  /** Giờ bắt đầu dạng 24h, ví dụ "09:00". */
  time: string
  session: ConsultationSession
  full: boolean
}

/** Một ngày trong dải 7 chip ngày (T2 → CN). */
export interface ConsultationDay {
  /** ISO date `yyyy-mm-dd` — khóa của chip ngày. */
  date: string
  slots: ConsultationSlot[]
}

export type ConsultationBookingStatus = 'pending' | 'confirmed' | 'cancelled'

/** Lịch hẹn đã đặt, trả về sau khi xác nhận ở modal (mục VIII.3). */
export interface ConsultationBooking {
  id: string
  consultantId: string
  consultantName: string
  date: string
  time: string
  phone: string
  note?: string
  /** `pending` cho tới khi SAVICO gọi xác nhận trong 24h làm việc. */
  status: ConsultationBookingStatus
  createdAt: string
}

/** Payload gửi lên khi bấm "Xác nhận đặt lịch". */
export interface BookConsultationPayload {
  consultantId: string
  date: string
  time: string
  /** SĐT đã chuẩn hóa (bỏ dấu phân cách) — KTS gọi lại qua số này. */
  phone: string
  note?: string
}

export type ConsultationHistoryStatus = 'pending' | 'confirmed' | 'done' | 'cancelled' | 'missed'

/** Một dòng lịch sử tư vấn trong tab Tài khoản. */
export interface ConsultationHistoryBooking {
  id: string
  consultantId: string
  consultantName: string
  specialtyLabel: string
  yearsExperience: number
  date: string
  time: string
  durationMinutes: number
  note?: string
  sessionNote?: string
  rating?: number
  status: ConsultationHistoryStatus
  /** Ngày khách hủy để UI giải thích việc hoàn lượt. */
  cancelledAt?: string
  /** Số lần KTS đã thử liên hệ khi khách không tham gia. */
  contactAttempts?: number
  /** Buổi này được tính trong gói đang dùng. */
  withinPlan?: boolean
}

/** Dữ liệu riêng của tab "Lịch sử tư vấn 1:1". */
export interface ConsultationHistory {
  planTier: 'basic' | 'advanced' | 'pro'
  remainingCredits: number
  bookings: ConsultationHistoryBooking[]
}
