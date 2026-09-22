'use client'

import { create } from 'zustand'

import type { ChatContextStore } from './chat-context.types'

/**
 * Ngữ cảnh dự án dùng chung cho chatbox AI (mục III.3a).
 *
 * Nằm ở `shared/` vì nó nối hai feature không được import lẫn nhau: luồng thiết
 * kế ghi vào, chatbox đọc ra. Không persist — ngữ cảnh chỉ đúng cho phiên xem
 * hiện tại.
 */
export const useChatContextStore = create<ChatContextStore>()((set) => ({
  context: null,
  waitingFlow: null,
  panelOpen: false,
  dockSuppressed: false,
  setContext: (context) => set({ context }),
  setWaitingFlow: (waitingFlow) => set({ waitingFlow }),
  setPanelOpen: (panelOpen) => set({ panelOpen }),
  setDockSuppressed: (dockSuppressed) => set({ dockSuppressed })
}))
