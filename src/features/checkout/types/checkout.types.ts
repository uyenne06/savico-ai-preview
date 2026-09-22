/**
 * Kiểu dữ liệu của luồng MUA GÓI (S03–S08).
 *
 * R10 chi phối cả file: chỉ còn MỘT hình thức thanh toán là QR chuyển khoản.
 * Không có `paymentMethod`, không có trường thẻ, không có cổng thanh toán — bỏ
 * hẳn thay vì để một enum một phần tử rồi vài tháng nữa có người thêm lại.
 */

/** Thứ được bán: gói thiết kế (S01) hoặc gói giám sát thi công (S19). */
export type OrderKind = 'design' | 'supervision'

/**
 * Trạng thái đơn hàng — cũng là thứ quyết định màn nào được mở:
 * `awaiting` → S04 (QR), `verifying` → S06, `failed` → S07, `paid` → S08.
 */
export type OrderStatus = 'awaiting' | 'verifying' | 'failed' | 'paid'

/** Thông tin người mua, sửa được ngay trên màn xác nhận đơn (S03). */
export interface OrderBuyer {
  name: string
  phone: string
  email: string
}

/** Khối "Xuất hóa đơn" (S03) — tắt mặc định, bật thì cần đủ thông tin công ty. */
export interface OrderInvoice {
  enabled: boolean
  company: string
  taxCode: string
  address: string
  email: string
}

/** Bản chụp sản phẩm tại thời điểm đặt — giá đổi sau đó không làm đơn cũ đổi theo. */
export interface OrderProduct {
  id: string
  kind: OrderKind
  /** Nhãn hiển thị, ví dụ "PLUS" hoặc "Gói An Tâm". */
  name: string
  price: number
  /** Vài dòng quyền lợi in trong khối "Đơn hàng của bạn". */
  benefits: string[]
}

/** Thông tin chuyển khoản hiện ở S04 và nhắc lại ở S06. */
export interface TransferInfo {
  bankName: string
  accountNumber: string
  accountName: string
  /** Nội dung chuyển khoản — sai nội dung là đơn phải xác nhận thủ công. */
  content: string
  /** Chuỗi mã QR (bản mock dựng từ chính thông tin trên). */
  qrPayload: string
}

/** Một đơn mua gói. */
export interface Order {
  /** Mã đơn hàng `SVC-YYNNN`, hiện ở S04, S06, S07. */
  id: string
  product: OrderProduct
  /** Dự án gắn với đơn — chỉ có với gói giám sát (R8). */
  projectId?: string
  buyer: OrderBuyer
  invoice: OrderInvoice
  /** Mã giảm giá đã áp dụng, rỗng nếu chưa áp. */
  discountCode: string
  discountPercent: number
  subtotal: number
  discountAmount: number
  total: number
  status: OrderStatus
  createdAt: string
  /** Hạn của mã QR hiện tại (ISO) — hết hạn thì tạo lại mã (S04). */
  expiresAt: string
  /** Thời điểm người dùng báo đã chuyển khoản; dùng để giữ bộ đếm S06 qua reload. */
  verifyingStartedAt?: string
  transfer: TransferInfo
}

/** Dữ liệu tạo đơn từ màn xác nhận (S03). */
export interface CreateOrderPayload {
  productId: string
  kind: OrderKind
  projectId?: string
  buyer: OrderBuyer
  invoice: OrderInvoice
  discountCode: string
}
