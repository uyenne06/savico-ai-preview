/**
 * Dữ liệu thật của dự án mà chatbox AI dựa vào để trò chuyện (mục III.3a).
 *
 * Nhãn đã bản địa hóa sẵn: `features/design` biết dữ liệu nhưng không được
 * import `features/chatbot`, nên lớp app dịch nhãn rồi đặt vào store này.
 */
export interface ProjectChatContext {
  projectName: string
  /** Khu vực — phường/xã + tỉnh/thành, không kèm số nhà. */
  area: string
  /** "Nhà phố", "Căn hộ"… đã bản địa hóa. */
  buildingLabel: string
  /** "Trệt + 2 lầu · Có tum", rỗng với Căn hộ. */
  scaleLabel: string
  packageLabel: string
  interiorStyleLabel: string
  /** Người dùng đã tải ảnh lô đất ở Bước 1 hay chưa. */
  hasLandPhoto: boolean
}

/** Giai đoạn đang chờ AI — quyết định kịch bản chatbot nói gì. */
export type ChatFlow = 'estimate' | 'dossier'

export interface ChatContextStore {
  context: ProjectChatContext | null
  /** Khác `null` khi đang ở màn chờ AI — chatbot chủ động trò chuyện. */
  waitingFlow: ChatFlow | null
  /** Khung chat nổi góc phải dưới đang mở hay đóng (quy ước xuyên suốt, mục I). */
  panelOpen: boolean
  /** Ẩn toàn bộ AI dock tạm thời khi một UI ưu tiên cao hơn (vd. biên nhận) đang mở. */
  dockSuppressed: boolean
  setContext: (context: ProjectChatContext | null) => void
  setWaitingFlow: (flow: ChatFlow | null) => void
  setPanelOpen: (open: boolean) => void
  setDockSuppressed: (suppressed: boolean) => void
}
