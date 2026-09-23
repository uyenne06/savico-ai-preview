'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'

import { useRouter } from '@/i18n/navigation'
import { CONTRACTOR_PREVIEW_ID, contractorBriefRoute, contractorReviewRoute } from '@/shared/constants/routes'
import { isApiError } from '@/shared/lib/api'
import { contractorsApi, type CreateBriefFromDesignPayload, type SaveBriefPayload } from '../api/contractors.api'
import { contractorKeys } from '../api/contractors.keys'

/**
 * Hồ sơ dự án đang mở (S10, S11 và header dự án ở S12–S18).
 *
 * Ở chế độ xem thử KHÔNG gọi: `preview` không phải mã dự án thật, gọi lên là
 * nhận 404 và màn hình đầy log lỗi trong khi đúng ra chỗ đó chỉ cần bỏ trống
 * thẻ dự án.
 */
export function useBrief(projectId: string) {
  return useQuery({
    queryKey: contractorKeys.brief(projectId),
    queryFn: () => contractorsApi.getBrief(projectId),
    enabled: Boolean(projectId) && projectId !== CONTRACTOR_PREVIEW_ID
  })
}

/**
 * Hồ sơ dự án của tài khoản, mới nhất trước.
 *
 * Landing S09 cần biết khách ĐÃ CÓ hồ sơ hay chưa: nút "Xem nhà thầu" dẫn thẳng
 * sang S12 của hồ sơ gần nhất, còn chưa có hồ sơ nào thì phải tạo trước — S12
 * xếp hạng theo địa chỉ và quy mô của dự án nên không có hồ sơ thì không có gì
 * để xếp.
 */
export function useBriefs(enabled = true) {
  return useQuery({
    queryKey: contractorKeys.briefList(),
    queryFn: () => contractorsApi.listBriefs(),
    enabled
  })
}

/**
 * "Tạo hồ sơ" ở landing (S09) — sinh mã dự án rồi mở thẳng Bước 1.
 *
 * Hồ sơ được tạo TRƯỚC khi khách nhập gì, giống luồng thiết kế: có mã dự án thì
 * mới lưu nháp được, và mọi màn sau (S12–S18) đều gắn theo mã đó.
 */
export function useCreateBrief() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const t = useTranslations('errors')

  return useMutation({
    mutationFn: () => contractorsApi.createBrief(),
    onSuccess: (brief) => {
      queryClient.setQueryData(contractorKeys.brief(brief.id), brief)
      router.push(contractorBriefRoute(brief.id))
    },
    onError: (error) => {
      toast.error(isApiError(error) ? error.message : t('generic'))
    }
  })
}

/**
 * "Tạo hồ sơ từ gói" ở landing (S09, ★ mục 9) — dựng hồ sơ sẵn từ dự án thiết
 * kế đã có dự toán, bỏ qua Bước 1 và mở thẳng Bước 2 — Kiểm tra hồ sơ (S11).
 */
export function useCreateBriefFromDesign() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const t = useTranslations('errors')

  return useMutation({
    mutationFn: (payload: CreateBriefFromDesignPayload) => contractorsApi.createBriefFromDesign(payload),
    onSuccess: (brief) => {
      queryClient.setQueryData(contractorKeys.brief(brief.id), brief)
      router.push(contractorReviewRoute(brief.id))
    },
    onError: (error) => {
      toast.error(isApiError(error) ? error.message : t('generic'))
    }
  })
}

/** Lưu Bước 1 — dùng cho cả "Lưu nháp" và "Tiếp tục: Kiểm tra hồ sơ" (S10). */
export function useSaveBrief(projectId: string) {
  const queryClient = useQueryClient()
  const t = useTranslations('errors')

  return useMutation({
    mutationFn: (payload: SaveBriefPayload) => contractorsApi.saveBrief(projectId, payload),
    onSuccess: (brief) => {
      queryClient.setQueryData(contractorKeys.brief(projectId), brief)
    },
    onError: (error) => {
      toast.error(isApiError(error) ? error.message : t('generic'))
    }
  })
}

/**
 * "Hoàn tất & tìm nhà thầu" ở Bước 2 (S11). Chốt hồ sơ rồi trả về để lớp app mở
 * popup 3 lựa chọn (R7) — điều hướng tiếp do màn hình quyết định, không phải hook.
 */
export function useCompleteBrief(projectId: string) {
  const queryClient = useQueryClient()
  const t = useTranslations('errors')

  return useMutation({
    mutationFn: () => contractorsApi.completeBrief(projectId),
    onSuccess: (brief) => {
      queryClient.setQueryData(contractorKeys.brief(projectId), brief)
    },
    onError: (error) => {
      toast.error(isApiError(error) ? error.message : t('generic'))
    }
  })
}
