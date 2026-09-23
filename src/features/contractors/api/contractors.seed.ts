import { BUILDING_IMAGE } from '@/shared/lib/imagery'
import type { Contractor } from '../types/contractor.types'

/**
 * Danh bạ nhà thầu mẫu cho bản mock (S12–S15).
 *
 * Số liệu là dữ liệu minh họa — khi có backend, danh bạ này do đội vận hành
 * quản lý trong khu quản trị. Cố ý KHÔNG có trường nào liên quan tới giá: web
 * không hiển thị báo giá của nhà thầu (R2).
 *
 * Khoảng cách trải từ 2 tới 26 km để bộ lọc bán kính ở S12 (5/10/20/50 km)
 * thật sự lọc ra kết quả khác nhau chứ không phải nút bấm cho có.
 */
export const CONTRACTORS_SEED: readonly Contractor[] = [
  {
    id: 'ctr-abc',
    name: 'ABC Construction',
    kind: 'Nhà thầu xây dựng',
    verified: true,
    rating: 4.8,
    reviewCount: 126,
    similarProjects: 18,
    completedProjects: 46,
    distanceKm: 2.3,
    serviceAreas: ['TP. Buôn Ma Thuột', 'Cư M’gar', 'Krông Pắc'],
    region: 'central',
    surveyWithinHours: 24,
    acceptingProjects: true,
    intro:
      'ABC Construction là đơn vị thiết kế và thi công nhà ở dân dụng với hơn 8 năm kinh nghiệm. Công ty sở hữu đội ngũ kiến trúc sư, kỹ sư và giám sát chuyên môn, đồng hành cùng khách hàng từ ý tưởng đến khi hoàn thiện công trình.',
    strengths: ['Nhà phố', 'Thi công trọn gói', 'Phần thô', 'Hoàn thiện'],
    photos: [{ caption: 'Trụ sở công ty' }, { caption: 'Văn phòng làm việc' }, { caption: 'Đội ngũ nhân sự' }],
    foundedYear: 2016,
    teamSize: '32',
    officeAddress: 'TP. Buôn Ma Thuột, Đắk Lắk',
    warrantyMonths: 24,
    legalChecks: [
      'Giấy phép kinh doanh đã xác minh',
      'Đội ngũ kỹ sư phụ trách',
      'Bảo hiểm công trình',
      'Cam kết bảo hành 24 tháng'
    ],
    legalProfile: {
      legalName: 'Công ty TNHH Xây dựng ABC Construction',
      taxCodeMasked: '6001•••••3',
      establishedAt: '2016-03-14',
      operationYears: 10,
      representative: 'Ông Nguyễn Văn A',
      representativeTitle: 'Giám đốc',
      registeredAddress: '12 Nguyễn Tất Thành, P. Tân Lợi, TP. Buôn Ma Thuột, Đắk Lắk',
      primaryBusiness: 'Xây dựng nhà để ở (mã 4101) · Hoàn thiện công trình (4330)',
      workforce: '32 kiến trúc sư & kỹ sư · khoảng 120 công nhân',
      registrationNumberMasked: '6001•••••3',
      registrationIssuedAt: '2016-03-14',
      registrationStatus: 'verified',
      verifiedAt: '2026-09-12',
      verifiedUntil: '2026-08-12',
      warrantyMonths: 24,
      usesSavicoContract: true,
      hasConstructionInsurance: true,
      cooperationRank: 24,
      cooperationPercent: 96,
      complaintCount: 0
    },
    verifiedProjects: 12,
    featuredProjects: [
      {
        id: 'p1',
        name: 'Nhà phố Nguyễn Văn Linh',
        year: 2025,
        imageUrl: BUILDING_IMAGE.townhouse,
        verified: true,
        category: 'house',
        areaM2: 100,
        dimensions: '5×20m',
        scale: 'Trệt + 2 lầu',
        location: 'P. Tân An, TP. Buôn Ma Thuột',
        constructionScope: 'turnkey',
        contractorRole: 'general-contractor',
        constructionMonths: 5,
        constructionStartedAt: '2025-03-01',
        constructionEndedAt: '2025-08-01',
        mainItems: 'Móng băng, khung BTCT, hoàn thiện nội thất, hệ thống điện nước',
        verifiedAt: '2026-08-12',
        tags: ['Nhà phố', 'Thi công trọn gói', 'Hoàn thiện']
      },
      {
        id: 'p2',
        name: 'Nhà phố Tân Quy',
        year: 2024,
        imageUrl: BUILDING_IMAGE.roofed,
        verified: true,
        category: 'house',
        areaM2: 81,
        dimensions: '4,5×18m',
        scale: 'Trệt + 1 lầu',
        location: 'P. Tân Lợi, TP. Buôn Ma Thuột',
        tags: ['Nhà phố', 'Phần thô', 'Hoàn thiện']
      },
      {
        id: 'p3',
        name: 'Cải tạo nhà Hòa Bình',
        year: 2023,
        imageUrl: BUILDING_IMAGE.apartment,
        verified: true,
        category: 'renovation',
        areaM2: 120,
        scale: 'Trệt + 1 lầu',
        location: 'P. Thành Công, TP. Buôn Ma Thuột',
        tags: ['Thi công trọn gói', 'Hoàn thiện']
      },
      {
        id: 'p4',
        name: 'Biệt thự vườn Ea Tu',
        year: 2025,
        imageUrl: BUILDING_IMAGE.garden,
        verified: true,
        category: 'villa',
        areaM2: 450,
        scale: '2 tầng',
        location: 'Xã Ea Tu, TP. Buôn Ma Thuột',
        tags: ['Biệt thự', 'Trọn gói']
      },
      {
        id: 'p5',
        name: 'Nhà phố Lê Duẩn',
        year: 2024,
        verified: false,
        category: 'house',
        areaM2: 110,
        dimensions: '5×22m',
        scale: 'Trệt + 3 lầu',
        location: 'P. Tân Thành, TP. Buôn Ma Thuột',
        tags: ['Nhà phố', 'Phần thô']
      },
      {
        id: 'p6',
        name: 'Nhà xưởng Cư M’gar',
        year: 2023,
        verified: true,
        category: 'factory',
        areaM2: 800,
        scale: '1 tầng',
        location: 'Huyện Cư M’gar, Đắk Lắk',
        tags: ['Nhà xưởng', 'Trọn gói']
      },
      {
        id: 'p7',
        name: 'Nhà phố Phan Chu Trinh',
        year: 2025,
        imageUrl: BUILDING_IMAGE.townhouse,
        verified: true,
        category: 'house',
        areaM2: 96,
        dimensions: '4,8×20m',
        scale: 'Trệt + 2 lầu',
        location: 'P. Thắng Lợi, TP. Buôn Ma Thuột',
        tags: ['Nhà phố', 'Trọn gói']
      },
      {
        id: 'p8',
        name: 'Biệt thự Tân An',
        year: 2025,
        imageUrl: BUILDING_IMAGE.villa,
        verified: true,
        category: 'villa',
        areaM2: 320,
        scale: '2 tầng',
        location: 'P. Tân An, TP. Buôn Ma Thuột',
        tags: ['Biệt thự', 'Hoàn thiện']
      },
      {
        id: 'p9',
        name: 'Cải tạo nhà Y Jút',
        year: 2024,
        imageUrl: BUILDING_IMAGE.apartment,
        verified: true,
        category: 'renovation',
        areaM2: 85,
        scale: 'Trệt + 1 lầu',
        location: 'P. Tân Lập, TP. Buôn Ma Thuột',
        tags: ['Cải tạo', 'Hoàn thiện']
      },
      {
        id: 'p10',
        name: 'Nhà phố Ama Khê',
        year: 2024,
        verified: true,
        category: 'house',
        areaM2: 90,
        dimensions: '5×18m',
        scale: 'Trệt + 2 lầu',
        location: 'P. Tự An, TP. Buôn Ma Thuột',
        tags: ['Nhà phố', 'Phần thô']
      },
      {
        id: 'p11',
        name: 'Biệt thự hồ Ea Kao',
        year: 2024,
        imageUrl: BUILDING_IMAGE.garden,
        verified: true,
        category: 'villa',
        areaM2: 380,
        scale: '2 tầng',
        location: 'Xã Ea Kao, TP. Buôn Ma Thuột',
        tags: ['Biệt thự', 'Trọn gói']
      },
      {
        id: 'p12',
        name: 'Nhà phố Lý Thường Kiệt',
        year: 2023,
        imageUrl: BUILDING_IMAGE.roofed,
        verified: true,
        category: 'house',
        areaM2: 105,
        dimensions: '5×21m',
        scale: 'Trệt + 2 lầu',
        location: 'P. Thống Nhất, TP. Buôn Ma Thuột',
        tags: ['Nhà phố', 'Hoàn thiện']
      },
      {
        id: 'p13',
        name: 'Nhà xưởng Hòa Phú',
        year: 2023,
        verified: true,
        category: 'factory',
        areaM2: 1200,
        scale: '1 tầng',
        location: 'KCN Hòa Phú, TP. Buôn Ma Thuột',
        tags: ['Nhà xưởng', 'Phần thô']
      },
      {
        id: 'p14',
        name: 'Nhà phố Hà Huy Tập',
        year: 2023,
        category: 'house',
        areaM2: 100,
        dimensions: '5×20m',
        scale: 'Trệt + 1 lầu',
        location: 'P. Tân Lợi, TP. Buôn Ma Thuột',
        tags: ['Nhà phố', 'Trọn gói']
      },
      {
        id: 'p15',
        name: 'Biệt thự Cư Êbur',
        year: 2022,
        imageUrl: BUILDING_IMAGE.villa,
        category: 'villa',
        areaM2: 410,
        scale: '2 tầng',
        location: 'Xã Cư Êbur, TP. Buôn Ma Thuột',
        tags: ['Biệt thự', 'Phần thô']
      },
      {
        id: 'p16',
        name: 'Cải tạo nhà Lê Thánh Tông',
        year: 2022,
        category: 'renovation',
        areaM2: 72,
        scale: 'Trệt + 1 lầu',
        location: 'P. Tân Lợi, TP. Buôn Ma Thuột',
        tags: ['Cải tạo', 'Hoàn thiện']
      },
      {
        id: 'p17',
        name: 'Nhà phố Trần Nhật Duật',
        year: 2022,
        imageUrl: BUILDING_IMAGE.townhouse,
        category: 'house',
        areaM2: 88,
        dimensions: '4,4×20m',
        scale: 'Trệt + 2 lầu',
        location: 'P. Tân Thành, TP. Buôn Ma Thuột',
        tags: ['Nhà phố', 'Trọn gói']
      },
      {
        id: 'p18',
        name: 'Nhà phố Nguyễn Chí Thanh',
        year: 2021,
        category: 'house',
        areaM2: 95,
        dimensions: '5×19m',
        scale: 'Trệt + 2 lầu',
        location: 'P. Tân An, TP. Buôn Ma Thuột',
        tags: ['Nhà phố', 'Phần thô']
      }
    ],
    partnership: {
      verified: true,
      since: '08/2026',
      contractCode: 'SVC-HT-2026-018',
      signedAt: '2026-08-15',
      pageCount: 4
    }
  },
  {
    id: 'ctr-angia',
    name: 'An Gia Build',
    kind: 'Nhà thầu xây dựng',
    verified: true,
    rating: 4.6,
    reviewCount: 98,
    similarProjects: 15,
    completedProjects: 38,
    distanceKm: 4.1,
    serviceAreas: ['TP. Buôn Ma Thuột', 'Buôn Đôn'],
    region: 'central',
    surveyWithinHours: 24,
    acceptingProjects: true,
    intro:
      'An Gia Build tập trung vào nhà phố và biệt thự trọn gói, có xưởng nội thất riêng nên chủ động được tiến độ phần hoàn thiện.',
    strengths: ['Nhà phố', 'Biệt thự', 'Thi công trọn gói', 'Nội thất'],
    photos: [{ caption: 'Trụ sở công ty' }, { caption: 'Văn phòng làm việc' }, { caption: 'Đội ngũ nhân sự' }],
    foundedYear: 2014,
    teamSize: '45',
    officeAddress: 'TP. Buôn Ma Thuột, Đắk Lắk',
    warrantyMonths: 18,
    legalChecks: ['Giấy phép kinh doanh đã xác minh', 'Đội ngũ kỹ sư phụ trách', 'Cam kết bảo hành'],
    verifiedProjects: 9,
    featuredProjects: [
      {
        id: 'p1',
        name: 'Biệt thự Tân An',
        year: 2025,
        imageUrl: BUILDING_IMAGE.villa,
        tags: ['Biệt thự', 'Thi công trọn gói', 'Nội thất']
      },
      {
        id: 'p2',
        name: 'Nhà phố Lê Duẩn',
        year: 2024,
        imageUrl: BUILDING_IMAGE.townhouse,
        tags: ['Nhà phố', 'Thi công trọn gói']
      }
    ],
    partnership: {
      verified: true,
      since: '05/2026',
      contractCode: 'SVC-HT-2026-011',
      signedAt: '2026-05-06',
      pageCount: 4
    }
  },
  {
    id: 'ctr-hungphat',
    name: 'Hưng Phát Home',
    kind: 'Nhà thầu xây dựng',
    verified: true,
    rating: 4.5,
    reviewCount: 76,
    similarProjects: 12,
    completedProjects: 31,
    distanceKm: 3.7,
    serviceAreas: ['TP. Buôn Ma Thuột', 'Krông Ana'],
    region: 'central',
    surveyWithinHours: 48,
    acceptingProjects: true,
    intro:
      'Hưng Phát Home nhận phần thô và hoàn thiện cho nhà phố quy mô vừa, thế mạnh là kiểm soát khối lượng vật tư theo từng hạng mục.',
    strengths: ['Nhà phố', 'Phần thô', 'Hoàn thiện'],
    photos: [{ caption: 'Trụ sở công ty' }, { caption: 'Văn phòng làm việc' }, { caption: 'Đội ngũ nhân sự' }],
    foundedYear: 2018,
    teamSize: '24',
    officeAddress: 'TP. Buôn Ma Thuột, Đắk Lắk',
    warrantyMonths: 24,
    legalChecks: ['Giấy phép kinh doanh đã xác minh', 'Đội ngũ kỹ sư phụ trách', 'Bảo hiểm công trình'],
    verifiedProjects: 8,
    featuredProjects: [
      {
        id: 'p1',
        name: 'Nhà phố Y Jút',
        year: 2024,
        imageUrl: BUILDING_IMAGE.townhouse,
        tags: ['Nhà phố', 'Phần thô']
      },
      {
        id: 'p2',
        name: 'Nhà phố Phan Chu Trinh',
        year: 2023,
        imageUrl: BUILDING_IMAGE.roofed,
        tags: ['Nhà phố', 'Hoàn thiện']
      }
    ],
    partnership: {
      verified: true,
      since: '07/2026',
      contractCode: 'SVC-HT-2026-016',
      signedAt: '2026-07-02',
      pageCount: 3
    }
  },
  {
    id: 'ctr-truongthinh',
    name: 'Trường Thịnh E&C',
    kind: 'Nhà thầu xây dựng',
    verified: true,
    rating: 4.4,
    reviewCount: 54,
    similarProjects: 9,
    completedProjects: 24,
    distanceKm: 12.4,
    serviceAreas: ['Cư M’gar', 'TP. Buôn Ma Thuột'],
    region: 'central',
    surveyWithinHours: 48,
    acceptingProjects: true,
    intro:
      'Trường Thịnh E&C thi công biệt thự và công trình có kết cấu phức tạp, có bộ phận quản lý chất lượng độc lập với đội thi công.',
    strengths: ['Biệt thự', 'Thi công trọn gói'],
    photos: [{ caption: 'Trụ sở công ty' }, { caption: 'Văn phòng làm việc' }, { caption: 'Đội ngũ nhân sự' }],
    foundedYear: 2012,
    teamSize: '60',
    officeAddress: 'Cư M’gar, Đắk Lắk',
    warrantyMonths: 36,
    legalChecks: [
      'Giấy phép kinh doanh đã xác minh',
      'Đội ngũ kỹ sư phụ trách',
      'Bảo hiểm công trình',
      'Cam kết bảo hành'
    ],
    verifiedProjects: 6,
    featuredProjects: [
      {
        id: 'p1',
        name: 'Biệt thự vườn Ea Kao',
        year: 2025,
        imageUrl: BUILDING_IMAGE.garden,
        tags: ['Biệt thự', 'Thi công trọn gói']
      }
    ],
    partnership: {
      verified: true,
      since: '03/2026',
      contractCode: 'SVC-HT-2026-004',
      signedAt: '2026-03-18',
      pageCount: 4
    }
  },
  {
    id: 'ctr-daiviet',
    name: 'Đại Việt Group',
    kind: 'Nhà thầu xây dựng',
    verified: true,
    rating: 4.2,
    reviewCount: 41,
    similarProjects: 6,
    completedProjects: 17,
    distanceKm: 25.8,
    serviceAreas: ['Krông Pắc', 'Ea Kar'],
    region: 'central',
    surveyWithinHours: 48,
    acceptingProjects: false,
    intro:
      'Đại Việt Group nhận phần thô và hoàn thiện tại khu vực Krông Pắc – Ea Kar, quy mô đội nhỏ nên nhận số lượng dự án hạn chế.',
    strengths: ['Phần thô', 'Hoàn thiện'],
    photos: [{ caption: 'Trụ sở công ty' }, { caption: 'Văn phòng làm việc' }, { caption: 'Đội ngũ nhân sự' }],
    foundedYear: 2019,
    teamSize: '18',
    officeAddress: 'Krông Pắc, Đắk Lắk',
    warrantyMonths: 12,
    legalChecks: ['Giấy phép kinh doanh đã xác minh', 'Cam kết bảo hành'],
    verifiedProjects: 4,
    featuredProjects: [
      {
        id: 'p1',
        name: 'Nhà phố Phước An',
        year: 2024,
        imageUrl: BUILDING_IMAGE.townhouse,
        tags: ['Phần thô', 'Hoàn thiện']
      }
    ],
    partnership: {
      verified: true,
      since: '09/2026',
      contractCode: 'SVC-HT-2026-021',
      signedAt: '2026-09-01',
      pageCount: 3
    }
  }
] as const
