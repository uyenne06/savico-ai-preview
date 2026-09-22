'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'

import { AuthDialog, useLogout } from '@/features/auth'
import { CreateProjectDialog, resumeProjectRoute, useDesignStore } from '@/features/design'
import { usePathname, useRouter } from '@/i18n/navigation'
import { useAuth } from '@/shared/auth'
import { AccountMenu } from '@/shared/components/account-menu'
import { SiteHeader } from '@/shared/layouts'
import { useActiveProject } from './use-active-project'

/**
 * Signed-in account dropdown, wired with the auth feature's logout flow.
 *
 * `resumeProject` (chấm xanh trên avatar + "Mở tiếp dự án" đầu menu, mục II.2)
 * chỉ tính khi đã đăng nhập — dự án là dữ liệu riêng của tài khoản.
 */
function UserMenu({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  const { user } = useAuth()
  const logout = useLogout()
  const active = useActiveProject()
  if (!user) return null

  const resumeProject = active ? { id: active.id, href: resumeProjectRoute(active) } : null

  return (
    <AccountMenu
      user={user}
      onLogout={() => logout.mutate()}
      onOpenChange={onOpenChange}
      resumeProject={resumeProject}
    />
  )
}

/**
 * Cầu nối app-layer cho CTA ở feature khác muốn "Tạo dự án mới" mà không được
 * import trực tiếp feature/design. URL là contract trung gian, sau khi mở modal
 * thì query được dọn để refresh/back không tự bật lại.
 */
function CreateProjectQueryBridge() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const openCreateDialog = useDesignStore((s) => s.openCreateDialog)

  useEffect(() => {
    if (searchParams.get('createProject') !== '1') return

    openCreateDialog()
    const params = new URLSearchParams(searchParams.toString())
    params.delete('createProject')
    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [openCreateDialog, pathname, router, searchParams])

  return null
}

/**
 * App-layer glue for the shared toolbar (mục II.1).
 *
 * Lives in `app/` because only this layer may import `features/auth` and
 * `features/design` at the same time. Also mounts the two global dialogs:
 * the guest auth popup and the "Tạo dự án" modal.
 */
export function MainChrome() {
  const openCreateDialog = useDesignStore((s) => s.openCreateDialog)

  return (
    <>
      <SiteHeader UserMenu={UserMenu} onCreateProject={openCreateDialog} />
      {/* `AuthDialog` đọc `?auth=` và `?redirect=` bằng `useSearchParams`, nên nó
          phải nằm trong ranh giới Suspense của RIÊNG mình. Trước đây ranh giới
          đó do `app/[locale]/loading.tsx` vô tình đảm nhiệm — mà chính file ấy
          lại làm treo mọi route có đoạn cuối động khi tải thẳng URL. Bỏ file
          kia thì phải khai báo ranh giới ở đúng chỗ cần, là đây. */}
      <Suspense fallback={null}>
        <AuthDialog />
        <CreateProjectQueryBridge />
      </Suspense>
      <CreateProjectDialog />
    </>
  )
}
