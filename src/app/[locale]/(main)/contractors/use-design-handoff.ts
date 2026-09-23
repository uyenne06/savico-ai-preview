'use client'

import { useDesignQuota, useProjects, type Project } from '@/features/design'
import { useAuth } from '@/shared/auth'

export interface DesignHandoff {
  /** Đã mua gói thiết kế VÀ có ít nhất một dự án đã nhận dự toán (Bước 2 xong). */
  ready: boolean
  /** Dự án gần cập nhật nhất đủ điều kiện — nguồn dữ liệu cho "Tạo hồ sơ từ gói". */
  project: Project | null
}

/**
 * "Đã có gói thiết kế · hồ sơ sẵn sàng" cho landing Tìm nhà thầu (S09, mục
 * "Ranh giới dịch vụ" — nhánh ★ khi khách đã đi qua luồng thiết kế).
 *
 * Sống ở `app/` chứ không phải `features/contractors`: cần đọc cả
 * `useDesignQuota` lẫn `useProjects` của `features/design`, mà hai feature
 * không được import lẫn nhau — đúng lý do `useActiveProject` cạnh đây cũng ở
 * layer này.
 */
export function useDesignHandoff(): DesignHandoff {
  const { isAuthenticated } = useAuth()
  const { data: quota } = useDesignQuota()
  const { data: projects } = useProjects()

  if (!isAuthenticated) return { ready: false, project: null }

  const hasPlan = Boolean(quota?.planName)
  // "Sẵn sàng" = đã nhận dự toán (Bước 2) — `floorArea` chỉ có giá trị sau đó.
  const readyProject = [...(projects ?? [])]
    .filter((project) => project.floorArea != null)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]

  return { ready: hasPlan && Boolean(readyProject), project: readyProject ?? null }
}
