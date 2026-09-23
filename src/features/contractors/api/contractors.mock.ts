import { cmsDb } from '@/shared/cms'
import { mockDelay } from '@/shared/lib/mock'
import { MAX_INVITATIONS, SURVEY_SLOTS } from '../constants/contractors.constants'
import { emptyBrief } from '../services/brief.service'
import type {
  Contractor,
  ContractorReview,
  Invitation,
  InvitationStatus,
  ProjectBrief,
  ProjectBriefSummary,
  SurveyBooking,
  SurveyRequest,
  SurveySlot
} from '../types/contractor.types'
import type { CreateBriefFromDesignPayload, SaveBriefPayload, SurveyRequestDetail } from './contractors.api'
import { BRIEFS_SEED } from './briefs.seed'
import { CONTRACTORS_SEED } from './contractors.seed'

/**
 * Mock trong trình duyệt của luồng Tìm nhà thầu (S09–S18), bật bằng
 * `NEXT_PUBLIC_USE_MOCK_API=true`.
 *
 * Giống mock của luồng thiết kế, dữ liệu nằm ở `localStorage` chứ không phải bộ
 * nhớ tab: hồ sơ dự án là việc kéo dài nhiều phiên (lưu nháp rồi quay lại — S10),
 * còn lời mời thì phải sống đủ lâu để thấy ô đếm "Đã mời x/3" (R1) hoạt động.
 */
const STORE_KEY = 'savico.mock-contractors'

/**
 * LỜI MỜI KHÔNG nằm trong kho này mà ở bảng `contractorInvitations` của
 * `shared/cms`. R4 giao việc đẩy bốn nấc trạng thái cho đội vận hành, nên màn
 * quản trị phải ghi được đúng bản ghi mà trang khách đang đọc — hai kho riêng
 * thì admin bấm một nơi, khách xem một nẻo.
 */

interface MockStore {
  sequence: number
  invitationSequence: number
  requestSequence: number
  briefs: Record<string, ProjectBrief>
  requests: Record<string, SurveyRequest>
  /** Đánh giá nhà thầu, khoá theo mã lời mời — mỗi lời mời một lần. */
  reviews: Record<string, ContractorReview>
}

/**
 * Kho khởi tạo — nạp sẵn bốn hồ sơ mẫu (xem `briefs.seed`) để hộp thoại "Chọn
 * dự án" có đủ bốn trạng thái ngay lần mở đầu, không phải tự tạo tay từng cái.
 *
 * `sequence` nhảy qua số của các hồ sơ mẫu, nếu không thì dự án khách tạo tiếp
 * theo sẽ trùng mã với một hồ sơ mẫu và ghi đè lên nó.
 */
const emptyStore = (): MockStore => ({
  sequence: BRIEFS_SEED.length,
  invitationSequence: 141,
  requestSequence: 141,
  briefs: Object.fromEntries(BRIEFS_SEED.map((brief) => [brief.id, brief])),
  requests: {},
  reviews: {}
})

function loadStore(): MockStore {
  if (typeof window === 'undefined') return emptyStore()
  try {
    const raw = window.localStorage.getItem(STORE_KEY)
    return raw ? { ...emptyStore(), ...(JSON.parse(raw) as MockStore) } : emptyStore()
  } catch {
    return emptyStore()
  }
}

function saveStore(store: MockStore): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORE_KEY, JSON.stringify(store))
}

/** Mã dự án `SVC-YYYY-NNNN` — cùng quy ước với luồng thiết kế. */
function nextProjectId(store: MockStore): string {
  store.sequence += 1
  return `SVC-${new Date().getFullYear()}-${String(store.sequence).padStart(4, '0')}`
}

/** Mã lời mời `INV-YYYY-NNNN` hiện trên mỗi thẻ ở S18. */
function nextInvitationId(store: MockStore): string {
  store.invitationSequence += 1
  return `INV-${new Date().getFullYear()}-${String(store.invitationSequence).padStart(4, '0')}`
}

/** Mã yêu cầu khảo sát `KS-YYYY-NNNN` hiện ở S17. */
function nextRequestId(store: MockStore): string {
  store.requestSequence += 1
  return `KS-${new Date().getFullYear()}-${String(store.requestSequence).padStart(4, '0')}`
}

function notFound(what: string): never {
  throw new Error(`Mock: không tìm thấy ${what}`)
}

/**
 * Lời mời vừa gửi luôn ở nấc đầu tiên. Ba nấc sau do đội hỗ trợ SAVICO cập nhật
 * trong khu quản trị (R4) nên mock KHÔNG tự đẩy trạng thái theo thời gian — làm
 * vậy sẽ dựng ra một luồng tự động không tồn tại trong sản phẩm thật.
 */
function initialSteps(sentAt: string): Invitation['steps'] {
  return [{ status: 'sent' as InvitationStatus, at: sentAt }]
}

/**
 * Lời mời của một dự án, cũ trước mới sau.
 *
 * `cmsDb.upsert` đẩy bản ghi mới lên ĐẦU bảng để bảng quản trị thấy việc mới
 * nhất trước; thẻ ở S18 thì phải giữ đúng thứ tự khách đã gửi.
 */
function invitationsOf(projectId: string): Invitation[] {
  return (
    cmsDb
      .list('contractorInvitations')
      .filter((invitation) => invitation.projectId === projectId)
      // Cả một lượt gửi dùng CHUNG một `sentAt`, nên so mỗi mốc thời gian là hòa —
      // và thứ tự còn lại là thứ tự đảo của bảng. Mã lời mời tăng dần theo lượt
      // gửi nên nó mới là thứ phá hòa đúng: ABC → An Gia → Hưng Phát.
      .sort((a, b) => a.sentAt.localeCompare(b.sentAt) || a.id.localeCompare(b.id))
  )
}

/**
 * Gắn trạng thái `contracted` cho hồ sơ đã chốt được nhà thầu.
 *
 * Backend thật sẽ tự giữ cờ này, nhưng ở bản mock thì SUY RA từ lời mời: khảo
 * sát · báo giá · thương thảo · hợp đồng đều làm ngoài web (R3) nên thứ duy
 * nhất trên web đánh dấu "xong" là đội vận hành đẩy một lời mời của dự án lên
 * nấc cuối (R4). Suy ra thay vì thêm một cờ phải tự đặt bằng tay, nhờ vậy màn
 * quản trị sẵn có đã đủ để chạy tới trạng thái này.
 */
function withDerivedStatus(brief: ProjectBrief): ProjectBrief {
  const settled = cmsDb
    .list('contractorInvitations')
    .some((invitation) => invitation.projectId === brief.id && invitation.status === 'done')
  return settled ? { ...brief, status: 'contracted' } : brief
}

export const mockContractorsApi = {
  listContractors: async (_projectId: string): Promise<Contractor[]> => {
    await mockDelay(250)
    return [...CONTRACTORS_SEED]
  },

  getContractor: async (contractorId: string): Promise<Contractor> => {
    await mockDelay(200)
    return CONTRACTORS_SEED.find((c) => c.id === contractorId) ?? notFound(`nhà thầu ${contractorId}`)
  },

  createBrief: async (): Promise<ProjectBrief> => {
    await mockDelay(200)
    const store = loadStore()
    const now = new Date().toISOString()
    const brief: ProjectBrief = {
      ...emptyBrief(),
      id: nextProjectId(store),
      status: 'ready',
      createdAt: now,
      updatedAt: now
    }
    store.briefs[brief.id] = brief
    saveStore(store)
    return brief
  },

  createBriefFromDesign: async (payload: CreateBriefFromDesignPayload): Promise<ProjectBrief> => {
    await mockDelay(250)
    const store = loadStore()
    const now = new Date().toISOString()
    const brief: ProjectBrief = {
      ...emptyBrief(),
      name: payload.name,
      buildingType: payload.buildingType,
      landArea: payload.landArea,
      selfCreated: false,
      id: nextProjectId(store),
      status: 'ready',
      createdAt: now,
      updatedAt: now
    }
    store.briefs[brief.id] = brief
    saveStore(store)
    return brief
  },

  listBriefs: async (): Promise<ProjectBrief[]> => {
    await mockDelay(150)
    return Object.values(loadStore().briefs).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  },

  listBriefSummaries: async (): Promise<ProjectBriefSummary[]> => {
    await mockDelay(200)
    // Đếm lời mời MỘT lần cho cả bảng thay vì lọc lại theo từng dự án: hộp thoại
    // liệt kê mọi hồ sơ nên cách kia là n lần quét cùng một mảng.
    const counts = new Map<string, number>()
    for (const invitation of cmsDb.list('contractorInvitations')) {
      counts.set(invitation.projectId, (counts.get(invitation.projectId) ?? 0) + 1)
    }
    return Object.values(loadStore().briefs)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map((brief) => ({ brief: withDerivedStatus(brief), invitedCount: counts.get(brief.id) ?? 0 }))
  },

  getBrief: async (projectId: string): Promise<ProjectBrief> => {
    await mockDelay(150)
    const brief = loadStore().briefs[projectId] ?? notFound(`hồ sơ dự án ${projectId}`)
    return withDerivedStatus(brief)
  },

  saveBrief: async (projectId: string, payload: SaveBriefPayload): Promise<ProjectBrief> => {
    await mockDelay(250)
    const store = loadStore()
    const current = store.briefs[projectId] ?? notFound(`hồ sơ dự án ${projectId}`)
    const updated: ProjectBrief = { ...current, ...payload, updatedAt: new Date().toISOString() }
    store.briefs[projectId] = updated
    saveStore(store)
    return updated
  },

  completeBrief: async (projectId: string): Promise<ProjectBrief> => {
    await mockDelay(250)
    const store = loadStore()
    const current = store.briefs[projectId] ?? notFound(`hồ sơ dự án ${projectId}`)
    const updated: ProjectBrief = { ...current, status: 'ready', updatedAt: new Date().toISOString() }
    store.briefs[projectId] = updated
    saveStore(store)
    return updated
  },

  listSlots: async (contractorId: string, date: string): Promise<SurveySlot[]> => {
    await mockDelay(150)
    // Vài khung bận cố định theo cặp (nhà thầu, ngày) để lịch trông thật mà vẫn
    // ổn định giữa các lần render — random sẽ nhảy mỗi lần refetch.
    const seed = [...`${contractorId}${date}`].reduce((sum, char) => sum + char.charCodeAt(0), 0)
    return SURVEY_SLOTS.map((label, index) => ({
      id: `slot-${index}`,
      label,
      available: (seed + index * 7) % 5 !== 0
    }))
  },

  listInvitations: async (projectId: string): Promise<Invitation[]> => {
    await mockDelay(200)
    return invitationsOf(projectId)
  },

  createInvitations: async (projectId: string, bookings: SurveyBooking[]): Promise<SurveyRequestDetail> => {
    await mockDelay(400)
    const store = loadStore()
    const existing = invitationsOf(projectId)

    // R1 — chặn ở lớp dữ liệu chứ không chỉ ở nút bấm: mở hai tab rồi mời song
    // song vẫn không vượt được 3 lời mời.
    const room = MAX_INVITATIONS - existing.length
    if (room <= 0) throw new Error('Mock: dự án đã đủ 3 lời mời')

    const sentAt = new Date().toISOString()
    const brief = store.briefs[projectId]
    const created = bookings.slice(0, room).map<Invitation>((booking) => ({
      id: nextInvitationId(store),
      projectId,
      // Tên lặp lại trong bản ghi là có chủ đích — bảng quản trị cần tên để hiện
      // và tìm kiếm, mà danh bạ nhà thầu thì nằm trong feature này.
      projectName: brief?.name ?? projectId,
      contractorId: booking.contractorId,
      contractorName: CONTRACTORS_SEED.find((c) => c.id === booking.contractorId)?.name ?? booking.contractorId,
      sentAt,
      status: 'sent',
      updatedAt: sentAt,
      steps: initialSteps(sentAt),
      dossierVersion: 'v1',
      fileCount: brief?.documents.length ?? 0,
      survey: booking
    }))

    const request: SurveyRequest = {
      id: nextRequestId(store),
      projectId,
      createdAt: sentAt,
      invitationIds: created.map((invitation) => invitation.id)
    }

    created.forEach((invitation) => cmsDb.upsert('contractorInvitations', invitation))
    store.requests[request.id] = request
    if (brief) store.briefs[projectId] = { ...brief, status: 'inviting' }
    saveStore(store)

    return { request, invitations: created }
  },

  getSurveyRequest: async (requestId: string): Promise<SurveyRequestDetail> => {
    await mockDelay(200)
    const store = loadStore()
    const request = store.requests[requestId] ?? notFound(`yêu cầu khảo sát ${requestId}`)
    const all = invitationsOf(request.projectId)
    return { request, invitations: all.filter((invitation) => request.invitationIds.includes(invitation.id)) }
  },

  listReviews: async (projectId: string): Promise<ContractorReview[]> => {
    await mockDelay(150)
    const store = loadStore()
    return Object.values(store.reviews).filter((review) => review.projectId === projectId)
  },

  submitReview: async (invitationId: string, rating: number, comment: string): Promise<ContractorReview> => {
    await mockDelay(250)
    const store = loadStore()

    // Chỉ lời mời đã ở nấc cuối mới đánh giá được — đúng câu S09 quảng cáo
    // "chỉ khách đã làm việc qua SAVICO mới được đánh giá". Chặn ở mock để khi
    // nối API thật, backend chỉ cần lặp lại đúng luật này.
    const invitation = cmsDb.find('contractorInvitations', invitationId) ?? notFound(`lời mời ${invitationId}`)
    const projectId = invitation.projectId
    if (invitation.status !== 'done') throw new Error(`Lời mời ${invitationId} chưa hoàn tất nên chưa đánh giá được.`)
    if (store.reviews[invitationId]) throw new Error(`Lời mời ${invitationId} đã được đánh giá.`)

    const review: ContractorReview = {
      invitationId,
      contractorId: invitation.contractorId,
      projectId,
      rating,
      comment,
      createdAt: new Date().toISOString()
    }
    store.reviews[invitationId] = review
    saveStore(store)
    return review
  }
}
