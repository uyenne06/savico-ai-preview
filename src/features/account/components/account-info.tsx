'use client'

import { Pencil } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { useAuth } from '@/shared/auth'
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/avatar'
import { Button } from '@/shared/components/ui/button'
import { Skeleton } from '@/shared/components/ui/skeleton'
import { cn } from '@/shared/lib/utils'
import { ProfileEditDialog } from './profile-edit-dialog'

/**
 * Thẻ hồ sơ tài khoản (Hình S24): ảnh đại diện bên TRÁI, tên · số điện thoại ·
 * email xếp dọc bên phải, rồi nút "Chỉnh sửa" chạy hết bề ngang. Là thẻ trên
 * cùng của cột trái trang Tài khoản; thẻ "GÓI CỦA TÔI" nằm ngay dưới
 * (`PlanCard`).
 */
export function AccountInfo() {
  const t = useTranslations('account.info')
  const { user } = useAuth()
  const [isEditing, setEditing] = useState(false)

  if (!user) return <Skeleton className='h-28 w-full rounded-xl' />

  const initials =
    user.name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase() || '?'

  return (
    <section className='bg-card rounded-xl border p-4'>
      <div className='flex items-center gap-3'>
        <Avatar className='size-12 shrink-0'>
          <AvatarImage src={user.avatarUrl} alt={user.name} />
          {/* Hình S24: vòng tròn XANH LÁ nhạt, chữ tắt xanh đậm — mặc định của
              primitive là xám trung tính, đứng cạnh thẻ gói xanh thì trông như
              ảnh chưa tải xong. */}
          <AvatarFallback className='bg-accent text-primary-strong text-sm font-semibold'>{initials}</AvatarFallback>
        </Avatar>

        {/* Ba dòng chữ trần, không nhãn và không icon: "Số điện thoại:" /
            "Email:" chỉ lặp lại thứ nhìn là biết, mà thẻ này chỉ rộng 300px. */}
        <div className='min-w-0'>
          <p className='truncate text-sm font-semibold'>{user.name}</p>
          <p className={cn('truncate text-xs', user.phone ? 'text-muted-foreground' : 'text-muted-foreground/70')}>
            {user.phone ?? t('notProvided')}
          </p>
          <p className='text-muted-foreground truncate text-xs'>{user.email}</p>
        </div>
      </div>

      <Button variant='outline' size='sm' className='mt-3 h-8 w-full text-xs' onClick={() => setEditing(true)}>
        <Pencil className='size-3.5' />
        {t('edit')}
      </Button>

      <ProfileEditDialog open={isEditing} onClose={() => setEditing(false)} user={user} />
    </section>
  )
}
