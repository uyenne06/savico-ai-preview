import type { AuthUser } from '@/shared/auth'
import { env } from '@/shared/config/env'
import { http } from '@/shared/lib/api'
import type { AccountPlan, AccountPurchaseHistory, UpdateProfilePayload } from '../types/account.types'
import { mockAccountApi } from './account.mock'

/** Account API surface. Endpoint paths are placeholders until the .NET controllers land. */
const AccountApi = {
  /** Gói đăng ký đang dùng; `null` khi khách chưa mua gói (mục IX). */
  getPlan: () => http.get<AccountPlan | null>('/me/plan'),

  /** Gói đang dùng + sổ giao dịch chỉ của tài khoản đăng nhập. */
  getPurchaseHistory: () => http.get<AccountPurchaseHistory>('/me/purchase-history'),

  /**
   * Lưu họ tên / số điện thoại từ hộp thoại "Chỉnh sửa" (mục IX, Hình 17).
   * Trả về hồ sơ ĐẦY ĐỦ như `/auth/me` để phía gọi ghi thẳng vào store auth,
   * không phải tự ghép từ payload.
   */
  updateProfile: (payload: UpdateProfilePayload) => http.patch<AuthUser>('/me/profile', payload)
}

export const accountApi = env.NEXT_PUBLIC_USE_MOCK_API ? mockAccountApi : AccountApi
