import type { CmsSubscription, CmsTransaction } from '@/shared/cms'

/** Một hạn mức của gói: còn bao nhiêu trên tổng bao nhiêu. */
export interface PlanAllowance {
  remaining: number
  total: number
}

/**
 * Gói đăng ký đang dùng — thẻ "GÓI CỦA TÔI" ở cột trái trang Tài khoản
 * (mục IX, Hình 17). `null` nghĩa là khách chưa mua gói nào.
 */
export interface AccountPlan {
  /** Tên gói hiển thị, vd "Gói Nâng cao". */
  name: string
  /** Ngày hết hạn (ISO) — hiện thành "Hạn dùng: đến {ngày}". */
  expiresAt: string
  /** Lượt thiết kế - dự toán; cùng nguồn với hạn mức ở Bước 1 (mục IV.3.c). */
  design: PlanAllowance
  /** Lượt tra thư viện mẫu (mục V — sẽ bổ sung sau). */
  library: PlanAllowance
  /** Lượt tư vấn 1:1 đi kèm gói; tab lịch sử hiển thị số ĐÃ DÙNG / tổng. */
  consultation: PlanAllowance
}

/** Gói hiện tại + giao dịch thuộc riêng tài khoản đang đăng nhập. */
export interface AccountPurchaseHistory {
  subscription: CmsSubscription | null
  /** Đơn đã kích hoạt gói thiết kế hiện tại. */
  designOrderId: string | null
  /** Đơn đã kích hoạt gói giám sát hiện tại. */
  supervisionOrderId: string | null
  /** Đơn nâng cấp giám sát chưa hoàn tất thanh toán, nếu có. */
  pendingSupervisionOrderId: string | null
  /** Hạn gói giám sát theo giao dịch, độc lập với timeline dự án demo. */
  supervisionExpiresAt: string | null
  transactions: CmsTransaction[]
}

/**
 * Phần hồ sơ khách tự sửa được ở thẻ "Thông tin tài khoản" (mục IX, Hình 17).
 * Email không nằm ở đây: đó là danh tính đăng nhập, đổi phải qua luồng xác minh
 * của backend.
 */
export interface UpdateProfilePayload {
  name: string
  /** Chuỗi rỗng = xóa số đang có; backend trả về `phone` bỏ trống. */
  phone: string
}
