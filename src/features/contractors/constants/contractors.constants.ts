import type {
  ConstructionScope,
  ContractorSort,
  InvitationStatus,
  ProjectScale,
  SearchRadiusKm,
  ServiceRegion,
  SiteCondition,
  StartWindow
} from '../types/contractor.types'

/**
 * Hằng số của luồng Tìm nhà thầu (S09–S18).
 *
 * Mọi danh mục hiển thị đều đi qua đây để thanh lọc/sắp xếp ở S12 và bảng so
 * sánh ở S15 không bao giờ lệch thứ tự nhau.
 */

/**
 * R1 — mỗi dự án mời TỐI ĐA 3 nhà thầu. Con số này chặn cả nút "Mời báo giá"
 * (S12), số lượng chọn so sánh (S15) và ô đếm "Đã mời x/3" (S18).
 */
export const MAX_INVITATIONS = 3

/** Nhà thầu chọn từ M01 để M05 ghim đầu danh sách và loé viền đúng một lần. */
export const MATCHES_PINNED_CONTRACTOR_KEY = 'savico.matches-pinned-contractor'

/** Cờ một lần để M05 chuyển chéo thanh và thay cả cụm kết quả sau khi chọn dự án khác. */
export const MATCHES_PROJECT_CHANGED_KEY = 'savico.matches-project-changed'

/** Cờ một lần để bộ đếm lời mời lật số khi quay lại M05 từ màn gửi lời mời. */
export const MATCHES_INVITE_RETURN_KEY = 'savico.matches-invite-return'

/** Tiền tố cờ "M09 đã chạy hiệu ứng vào trang" theo từng mã yêu cầu — tải lại trang thì hiện thẳng. */
export const INVITE_SENT_INTRO_KEY = 'savico.invite-sent-intro'

/** Cờ một lần: bấm "Theo dõi yêu cầu" ở M09 → M10 trượt vào từ bên phải (đi tới). */
export const INVITATIONS_ARRIVE_FORWARD_KEY = 'savico.invitations-arrive-forward'

/** Cần ít nhất 2 nhà thầu thì bảng so sánh mới có nghĩa (S15). */
export const MIN_COMPARE = 2

/** Bán kính tìm kiếm — 4 nấc ở header dự án (S12). */
export const SEARCH_RADII: readonly SearchRadiusKm[] = [5, 10, 20, 50] as const

/** Mặc định 10 km: đủ rộng để có kết quả, đủ hẹp để nhà thầu chịu đi khảo sát. */
export const DEFAULT_RADIUS: SearchRadiusKm = 10

/** Tab vùng phục vụ (S12). */
export const SERVICE_REGIONS: readonly ServiceRegion[] = ['north', 'central', 'south'] as const

/** Chip sắp xếp (S12) — cùng thứ tự với 4 tab xếp hạng ở landing (S09). */
export const CONTRACTOR_SORTS: readonly ContractorSort[] = ['match', 'distance', 'rating', 'survey'] as const

/** 4 thẻ phạm vi thi công ở Bước 1 (S10). */
export const CONSTRUCTION_SCOPES: readonly ConstructionScope[] = ['turnkey', 'shell', 'finishing', 'interior'] as const

/** Hiện trạng khu đất (S10). */
export const SITE_CONDITIONS: readonly SiteCondition[] = ['empty', 'demolish', 'renovate'] as const

/** Quy mô công trình (S10). */
export const PROJECT_SCALES: readonly ProjectScale[] = [
  'ground',
  'ground+1',
  'ground+2',
  'ground+3',
  'ground+4'
] as const

/** Mốc khởi công dự kiến (S10). */
export const START_WINDOWS: readonly StartWindow[] = ['asap', 'in-1-3-months', 'in-3-6-months', 'undecided'] as const

/** Thanh 4 nấc trạng thái lời mời (S18) — thứ tự cũng là thứ tự thời gian. */
export const INVITATION_STEPS: readonly InvitationStatus[] = ['sent', 'received', 'accepted', 'done'] as const

/** Giờ hành chính T2–T7, mỗi khung 1 tiếng, nghỉ trưa 12:00–13:00 (S16). */
export const SURVEY_SLOTS: readonly string[] = [
  '08:00 – 09:00',
  '09:00 – 10:00',
  '10:00 – 11:00',
  '11:00 – 12:00',
  '13:00 – 14:00',
  '14:00 – 15:00',
  '15:00 – 16:00',
  '16:00 – 17:00'
] as const

/** Nhà thầu chỉ nhận lịch khảo sát trong 7 ngày tới (S16). */
export const SURVEY_WINDOW_DAYS = 7

/** Tệp đính kèm hồ sơ dự án: PDF/JPG/PNG/XLSX, tối đa 10 MB mỗi tệp (S10). */
export const BRIEF_FILE_MAX_BYTES = 10 * 1024 * 1024
export const BRIEF_FILE_ACCEPT = '.pdf,.jpg,.jpeg,.png,.xlsx'

/** 4 tab của hồ sơ nhà thầu (S13, S14) — một bộ duy nhất cho mọi tab. */
export const CONTRACTOR_TABS = ['overview', 'projects', 'legal', 'partnership'] as const
export type ContractorTab = (typeof CONTRACTOR_TABS)[number]

/** 8 tiêu chí của bảng so sánh (S15). Không tiêu chí nào liên quan tới giá (R2). */
export const COMPARE_CRITERIA = [
  'rating',
  'similarProjects',
  'distance',
  'surveyTime',
  'serviceAreas',
  'legal',
  'warranty',
  'accepting'
] as const
export type CompareCriterion = (typeof COMPARE_CRITERIA)[number]
