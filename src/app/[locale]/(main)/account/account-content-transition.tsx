'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

import { usePathname } from '@/i18n/navigation'
import { revealEase } from '@/shared/components/common'

/**
 * Chỉ animate phần nội dung của route con /account/*.
 *
 * Sidebar, tiêu đề và thanh tab nằm ngoài component này nên Next giữ nguyên
 * chúng khi đổi route; browser back/forward vẫn dùng URL thật thay vì state tab.
 */
export function AccountContentTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const reduceMotion = useReducedMotion()

  return (
    <div className='relative min-h-24'>
      <AnimatePresence mode='wait'>
        <motion.div
          key={pathname}
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.2, ease: revealEase }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
