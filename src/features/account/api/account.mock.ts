import type { AuthUser } from '@/shared/auth'
import { MOCK_SESSION_USER_KEY } from '@/shared/auth'
import { mockDelay } from '@/shared/lib/mock'
import type { ApiError } from '@/shared/types'
import { normalizePhone } from '@/shared/utils'
import type { AccountPlan, AccountPurchaseHistory, UpdateProfilePayload } from '../types/account.types'

function currentMockIdentity(): Pick<AuthUser, 'name' | 'email'> {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(MOCK_SESSION_USER_KEY)
    if (raw) {
      const user = JSON.parse(raw) as AuthUser
      return { name: user.name, email: user.email }
    }
  }

  return { name: 'Dev User', email: 'dev@bmt.local' }
}

/**
 * Gói mẫu cho chế độ mock (mục IX, Hình 17). Số lượt và tên gói thật do admin
 * cấu hình (mục X, #4 và #7); backend trả cùng một nguồn với hạn mức Bước 1 nên
 * hai chỗ luôn khớp nhau.
 */
export const mockAccountApi = {
  getPlan: async (): Promise<AccountPlan | null> => {
    await mockDelay(150)
    return {
      name: 'Gói Nâng cao',
      expiresAt: '2026-08-30T00:00:00.000Z',
      design: { remaining: 5, total: 7 },
      library: { remaining: 86, total: 100 },
      consultation: { remaining: 1, total: 2 }
    }
  },

  getPurchaseHistory: async (): Promise<AccountPurchaseHistory> => {
    await mockDelay(180)
    const customer = currentMockIdentity()

    return {
      subscription: {
        id: 'SUB-2026-26001',
        customerName: customer.name,
        customerEmail: customer.email,
        tier: 'advanced',
        startedAt: '2026-09-10',
        expiresAt: '2026-10-30',
        status: 'active'
      },
      designOrderId: 'SVC-26001',
      supervisionOrderId: 'SVC-26003',
      pendingSupervisionOrderId: 'SVC-26004',
      supervisionExpiresAt: '2027-01-15',
      transactions: [
        {
          id: 'SVC-26004',
          customerName: customer.name,
          customerEmail: customer.email,
          tier: 'pro',
          amount: 18_900_000,
          method: 'bank-qr',
          status: 'pending',
          createdAt: '2026-09-18T14:02:00',
          note: 'Đang chờ SAVICO xác nhận chuyển khoản.'
        },
        {
          id: 'SVC-26003',
          customerName: customer.name,
          customerEmail: customer.email,
          tier: 'pro',
          amount: 8_900_000,
          method: 'bank-qr',
          status: 'paid',
          createdAt: '2026-09-15T10:20:00',
          note: 'Đã kích hoạt gói.'
        },
        {
          id: 'SVC-26001',
          customerName: customer.name,
          customerEmail: customer.email,
          tier: 'advanced',
          amount: 3_990_000,
          method: 'bank-qr',
          status: 'paid',
          createdAt: '2026-09-10T12:01:00',
          note: 'Đã xuất hóa đơn VAT.'
        },
        {
          id: 'SVC-25990',
          customerName: customer.name,
          customerEmail: customer.email,
          tier: 'advanced',
          amount: 1_490_000,
          method: 'bank-qr',
          status: 'refunded',
          createdAt: '2026-09-02T09:40:00',
          note: 'Hoàn tiền do chưa sử dụng lượt nào.'
        },
        {
          id: 'SVC-25087',
          customerName: customer.name,
          customerEmail: customer.email,
          tier: 'basic',
          amount: 399_000,
          method: 'bank-qr',
          status: 'paid',
          createdAt: '2026-08-21T16:18:00',
          note: 'Đã dùng hết lượt.'
        }
      ]
    }
  },

  /**
   * Ghi thẳng vào bản ghi phiên giả mà `features/auth` đọc ở `/auth/me`, chứ
   * không giữ riêng một bản sao: mỗi lần tải lại trang `useCurrentUser` gọi
   * `/auth/me` rồi `setUser`, nên hồ sơ nào không nằm trong bản ghi đó sẽ bị
   * ghi đè ngược lại ngay sau khi F5.
   */
  updateProfile: async (payload: UpdateProfilePayload): Promise<AuthUser> => {
    await mockDelay(400)

    const raw = typeof window !== 'undefined' ? localStorage.getItem(MOCK_SESSION_USER_KEY) : null
    if (!raw) {
      const error: ApiError = { status: 401, message: 'No active session (mock).' }
      throw error
    }

    const phone = payload.phone.trim()
    const user: AuthUser = {
      ...(JSON.parse(raw) as AuthUser),
      name: payload.name.trim(),
      // Bỏ trống ô = xóa số, nên trường `phone` phải BIẾN MẤT chứ không thành
      // chuỗi rỗng — thẻ hồ sơ hiện "Chưa cập nhật" theo `user.phone ?? …`.
      phone: phone === '' ? undefined : normalizePhone(phone)
    }
    localStorage.setItem(MOCK_SESSION_USER_KEY, JSON.stringify(user))
    return user
  }
}
