/**
 * Hằng số luồng mua gói (S03–S08).
 */

/** Stepper 4 bước dùng chung cho cả mua gói thiết kế và gói giám sát. */
export const CHECKOUT_STEPS = ['plan', 'confirm', 'payment', 'done'] as const
export type CheckoutStep = (typeof CHECKOUT_STEPS)[number]

/** Mã QR sống 15 phút; hết hạn thì tạo lại (S04). */
export const QR_TTL_MINUTES = 15

/**
 * Mã giảm giá đang chạy. Bản thật lấy từ backend; đây là bảng mock để ô "Mã
 * giảm giá" ở S03 có thứ để kiểm tra.
 */
export const DISCOUNT_CODES: Record<string, number> = {
  SAVI10: 10,
  KHAITRUONG: 15
}

/** Cam kết hoàn tiền in dưới nút thanh toán (S03). */
export const REFUND_WINDOW_HOURS = 24

/** Đơn hàng chưa thanh toán được giữ lại bao lâu (S07). */
export const ORDER_HOLD_HOURS = 24
