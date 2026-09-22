/**
 * Centralized, type-safe route map (locale-agnostic).
 *
 * next-intl's `Link`/`useRouter` add the locale prefix automatically, so
 * paths here are written WITHOUT a leading locale segment.
 *
 * Screen numbering in the comments matches "Mô tả giao diện web SAVICO AI",
 * mục V — Danh mục màn hình.
 */
export const ROUTES = {
  // Public site (screens 1–3)
  HOME: '/', // 1. Trang chủ
  HANDBOOK: '/handbook', // 2. Cẩm nang
  GUIDE: '/guide', // 3. Hướng dẫn
  PLANS: '/plans', // Gói đăng ký — tab Gói thiết kế (S01)
  PLANS_SUPERVISION: '/plans/supervision', // Gói đăng ký — tab Gói giám sát (S19)
  CONTRACTORS: '/contractors', // Landing Tìm nhà thầu (S09)
  CONSULT: '/consult', // Tư vấn 1:1 (mục VIII)
  TERMS: '/terms',
  PRIVACY: '/privacy',

  // Auth
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',

  // Thiết kế & Dự toán — luồng 3 bước (screens 4–10)
  DESIGN: '/design',

  // Account (screen 11 + S24) — mỗi khu lớn có URL riêng để bookmark/reload/back-forward đúng màn.
  ACCOUNT: '/account',
  ACCOUNT_PROJECTS: '/account/projects',
  ACCOUNT_FAVORITES: '/account/favorites',
  ACCOUNT_DOSSIERS: '/account/dossiers',
  ACCOUNT_PURCHASES: '/account/purchases',
  ACCOUNT_CONSULTATIONS: '/account/consultations'
} as const

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]

/**
 * Khu quản trị — route group `(admin)` riêng, không dùng chung khung với site
 * công khai. Mọi đường dẫn bắt đầu bằng `/admin` nên chỉ cần MỘT tiền tố trong
 * `PROTECTED_ROUTE_PREFIXES` là proxy chặn được cả khu.
 */
export const ADMIN_ROUTES = {
  /** Tổng quan — số liệu nhanh toàn hệ thống. */
  DASHBOARD: '/admin',

  /* ---------------------------------------------------------------------------
   * Nội dung site — MỘT MÀN CHO MỖI TRANG CÔNG KHAI.
   *
   * Chia theo trang chứ không theo loại thứ: sửa trang Cẩm nang thì chữ, ảnh và
   * các bảng của chính nó nằm chung một chỗ, không phải đi ba mục khác nhau.
   * Tất cả chạy qua route động `/admin/content/[page]` — xem
   * `features/admin/constants/admin-pages.config.ts`.
   * ------------------------------------------------------------------------ */
  PAGE_HOME: '/admin/content/home',
  PAGE_HANDBOOK: '/admin/content/handbook',
  PAGE_GUIDE: '/admin/content/guide',
  PAGE_PLANS: '/admin/content/plans',
  PAGE_CONSULT: '/admin/content/consult',
  PAGE_DESIGN: '/admin/content/design',
  PAGE_ACCOUNT: '/admin/content/account',
  PAGE_LEGAL: '/admin/content/legal',
  /** Thanh điều hướng, chân trang, thông báo lỗi + thông tin liên hệ & SEO. */
  PAGE_SHELL: '/admin/content/shell',
  /** Chữ không thuộc riêng trang nào — nút chung, popup đăng nhập, thông báo lỗi. */
  PAGE_COMMON: '/admin/content/common',

  /* ---------------------------------------------------------------------------
   * Cấu hình hệ thống — CON SỐ điều khiển cách hệ thống chạy, không phải chữ
   * khách đọc. Tách hẳn khỏi nhóm nội dung: sửa giá gói hay hạn mức lượt AI là
   * việc khác hẳn với sửa tiêu đề một trang, trộn chung thì không ai biết mình
   * đang đụng vào cái gì.
   * ------------------------------------------------------------------------ */
  PLAN_TABLE: '/admin/plans',
  QUOTAS: '/admin/quotas',
  CONSULT_PACKAGES: '/admin/consult-packages',

  // Vận hành — dữ liệu backend sinh ra, không phải nội dung biên tập
  BOOKINGS: '/admin/bookings',
  RESCHEDULE: '/admin/bookings/reschedule',
  SUBSCRIPTIONS: '/admin/subscriptions',
  TRANSACTIONS: '/admin/transactions',
  REVIEWS: '/admin/reviews',
  REPORTS: '/admin/reports',
  PROJECTS: '/admin/projects',
  /** Lời mời báo giá — vận hành đẩy 4 nấc trạng thái của S18 (R4). */
  INVITATIONS: '/admin/invitations',
  /** Giám sát thi công — kỹ sư ghi kết quả kiểm tra và khóa giai đoạn (R5). */
  INSPECTIONS: '/admin/inspections',
  CUSTOMERS: '/admin/customers',

  // Danh mục cấu hình — mục X, #6
  CATALOG: '/admin/catalog',
  PRICING: '/admin/pricing'
} as const

export type AdminRoute = (typeof ADMIN_ROUTES)[keyof typeof ADMIN_ROUTES]

/** Trang chi tiết một mẫu trong thư viện Cẩm nang (mẫu bản vẽ 2D / nội thất 3D). */
export const handbookTemplateRoute = (id: string) => `${ROUTES.HANDBOOK}/mau/${id}`

/** Trang bài viết trong Cẩm nang / Tin tức. */
export const handbookArticleRoute = (slug: string) => `${ROUTES.HANDBOOK}/bai-viet/${slug}`

/** Hồ sơ một kiến trúc sư + khối chọn khung giờ tư vấn (mục VIII.2). */
export const consultantRoute = (consultantId: string) => `${ROUTES.CONSULT}/${consultantId}`

/** Mở trang Thiết kế & Dự toán và tự bật modal "Tạo dự án mới". */
export const designCreateRoute = () => `${ROUTES.DESIGN}?createProject=1`

/** Bước 1 — Nhập liệu. */
export const designInputRoute = (projectId: string) => `${ROUTES.DESIGN}/${projectId}/input`

/** Bước 2 — Nhận dự toán (màn chờ + kết quả dùng chung một route). */
export const designEstimateRoute = (projectId: string) => `${ROUTES.DESIGN}/${projectId}/estimate`

/** Bước 3 — Hồ sơ thi công (chưa render / đang render / hoàn tất). */
export const designDossierRoute = (projectId: string) => `${ROUTES.DESIGN}/${projectId}/dossier`

/** Public, no-login dossier view opened from a share link. */
export const shareRoute = (token: string) => `/share/${token}`

/* ===========================================================================
 * Mua gói — checkout 4 bước (S03, S04, S06, S07, S08).
 *
 * Số thứ tự màn của bản mô tả giữ nguyên kể cả S05 đã bỏ (chỉ QR chuyển khoản,
 * R10), nên đường dẫn đặt theo TRẠNG THÁI ĐƠN chứ không theo số bước.
 * ======================================================================== */

/** Bước 2/4 — Xác nhận đơn hàng (S03). `plan` là gói được chọn ở S01/S19. */
export const checkoutConfirmRoute = (plan: string, projectId?: string) =>
  `/checkout/confirm?plan=${plan}${projectId ? `&project=${projectId}` : ''}`

/** Bước 3/4 — Thanh toán QR (S04). */
export const checkoutPaymentRoute = (orderId: string) => `/checkout/${orderId}/payment`

/** Đang xác nhận chuyển khoản (S06). */
export const checkoutVerifyingRoute = (orderId: string) => `/checkout/${orderId}/verifying`

/** Chưa nhận được thanh toán (S07). */
export const checkoutFailedRoute = (orderId: string) => `/checkout/${orderId}/failed`

/** Bước 4/4 — Hoàn tất + popup "Bạn muốn bắt đầu như thế nào?" (S08). */
export const checkoutDoneRoute = (orderId: string) => `/checkout/${orderId}/done`

/* ===========================================================================
 * Tìm nhà thầu (S09–S18) — mọi màn sau landing đều gắn với MỘT hồ sơ dự án,
 * nên projectId nằm ngay trong đường dẫn (giống luồng thiết kế 3 bước).
 * ======================================================================== */

/**
 * Mã dự án GIẢ cho chế độ XEM THỬ danh sách nhà thầu.
 *
 * Khách bấm "Xem nhà thầu" ở landing khi chưa có hồ sơ nào thì vẫn phải xem được
 * danh sách — trước đây chỗ đó tự đẻ một hồ sơ rỗng rồi ném thẳng vào Bước 1,
 * tức là bắt khai báo trước khi cho xem hàng.
 *
 * Dùng một mã giả thay vì dựng thêm bộ route không có `projectId`: mọi màn con
 * (S12, S13, S15) giữ nguyên đường dẫn và mọi liên kết giữa chúng vẫn ở lại
 * trong chế độ xem thử. Mã dự án thật luôn có dạng `SVC-YYYY-NNNN` nên không
 * đụng nhau.
 */
export const CONTRACTOR_PREVIEW_ID = 'preview'

/** Danh sách nhà thầu ở chế độ xem thử — chưa gắn hồ sơ dự án nào. */
export const contractorPreviewRoute = () => `${ROUTES.CONTRACTORS}/${CONTRACTOR_PREVIEW_ID}/matches`

/** Bước 1 — Tự tạo / chỉnh sửa hồ sơ dự án (S10). */
export const contractorBriefRoute = (projectId: string) => `${ROUTES.CONTRACTORS}/${projectId}/profile`

/** Bước 2 — Kiểm tra hồ sơ dự án (S11). */
export const contractorReviewRoute = (projectId: string) => `${ROUTES.CONTRACTORS}/${projectId}/review`

/** Nhà thầu được đề xuất (S12). */
export const contractorMatchesRoute = (projectId: string) => `${ROUTES.CONTRACTORS}/${projectId}/matches`

/** So sánh hồ sơ nhà thầu (S15). */
export const contractorCompareRoute = (projectId: string) => `${ROUTES.CONTRACTORS}/${projectId}/compare`

/** Hồ sơ một nhà thầu — 4 tab dùng chung header (S13, S14). */
export const contractorFirmRoute = (projectId: string, contractorId: string, tab?: string) =>
  `${ROUTES.CONTRACTORS}/${projectId}/firm/${contractorId}${tab ? `?tab=${tab}` : ''}`

/** Chọn thời gian khảo sát cho một nhà thầu (S16). */
export const contractorInviteRoute = (projectId: string, contractorId: string) =>
  `${ROUTES.CONTRACTORS}/${projectId}/invite/${contractorId}`

/** Đã gửi lời mời & đăng ký khảo sát (S17). */
export const contractorInviteSentRoute = (projectId: string, requestId: string) =>
  `${ROUTES.CONTRACTORS}/${projectId}/invite/sent?request=${requestId}`

/** Lời mời báo giá — theo dõi lời mời đã gửi (S18). */
export const contractorInvitationsRoute = (projectId: string) => `${ROUTES.CONTRACTORS}/${projectId}/invitations`

/* ===========================================================================
 * Gói giám sát thi công (S19–S23)
 * ======================================================================== */

/**
 * Tab Gói giám sát kèm dự án (R8): nút "Chọn cách quản lý thi công" link thẳng
 * vào đây, không popup và không dựng trang riêng.
 */
export const supervisionPlansRoute = (projectId: string) => `${ROUTES.PLANS_SUPERVISION}?project=${projectId}`

/** Bảng điều khiển giám sát — MỘT trang, 4 trạng thái giai đoạn (S20–S23). */
export const supervisionRoute = (projectId: string, stage?: number) =>
  `/supervision/${projectId}${stage ? `?stage=${stage}` : ''}`

/**
 * Routes a guest may NOT access once authenticated (redirect home).
 * Login/register are a popup rather than pages, so only the standalone
 * password-reset screen remains guest-only.
 */
export const GUEST_ONLY_ROUTES: readonly string[] = [ROUTES.FORGOT_PASSWORD]

/** Route prefixes that require authentication. */
export const PROTECTED_ROUTE_PREFIXES: readonly string[] = [
  ROUTES.DESIGN,
  ROUTES.ACCOUNT,
  '/checkout',
  '/supervision',
  ADMIN_ROUTES.DASHBOARD
]

/**
 * Khu chỉ dành vai trò `admin`. Proxy chỉ biết "đã đăng nhập hay chưa" (nó đọc
 * cookie, không giải mã token) nên lớp chặn theo vai trò nằm ở `AdminGuard`
 * trong layout — và backend vẫn là nơi phân quyền thật sự.
 */
export const ADMIN_ROUTE_PREFIX: string = ADMIN_ROUTES.DASHBOARD
