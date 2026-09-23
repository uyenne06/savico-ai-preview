import type { BriefDocument, ProjectBrief } from '../types/contractor.types'

/**
 * Logic thuần của hồ sơ dự án (S10, S11) — không React, không HTTP.
 */

/** Hồ sơ rỗng cho màn Bước 1 khi khách bắt đầu từ đầu (S10). */
export function emptyBrief(): Omit<ProjectBrief, 'id' | 'createdAt' | 'updatedAt' | 'status'> {
  return {
    name: '',
    buildingType: '',
    landArea: 0,
    siteCondition: 'empty',
    scale: 'ground+1',
    hasAttic: null,
    address: { provinceCode: null, provinceName: '', wardCode: null, wardName: '', street: '' },
    budget: 0,
    startWindow: 'in-1-3-months',
    scope: 'turnkey',
    scopeNote: '',
    documents: [],
    coverUrl: null,
    selfCreated: true
  }
}

/** Địa chỉ một dòng cho header dự án ở S12–S18: "P. Tân Lợi, Đắk Lắk". */
export function shortAddress(brief: Pick<ProjectBrief, 'address'>): string {
  const { wardName, provinceName } = brief.address
  return [wardName, provinceName].filter(Boolean).join(', ')
}

/** Địa chỉ đầy đủ cho khối tóm tắt ở S11 và địa điểm khảo sát ở S16/S17. */
export function fullAddress(brief: Pick<ProjectBrief, 'address'>): string {
  const { street, wardName, provinceName } = brief.address
  return [street, wardName, provinceName].filter(Boolean).join(', ')
}

/**
 * Ba dấu tick "Hồ sơ đã sẵn sàng" ở cột phải S11. Mỗi mục là một điều kiện có
 * thể tự kiểm tra được, không phải câu quảng cáo: đủ thông tin công trình, đã
 * mô tả nhu cầu, và (khuyến nghị) có tài liệu kèm theo.
 */
export interface BriefReadiness {
  hasProjectInfo: boolean
  hasNeeds: boolean
  hasDocuments: boolean
}

export function briefReadiness(brief: ProjectBrief): BriefReadiness {
  return {
    hasProjectInfo: Boolean(brief.name && brief.buildingType && brief.landArea > 0 && brief.address.provinceName),
    hasNeeds: Boolean(brief.scope && brief.scopeNote.trim().length > 0),
    hasDocuments: brief.documents.length > 0
  }
}

/** Hồ sơ đủ điều kiện bấm "Hoàn tất & tìm nhà thầu" (S11). */
export function isBriefComplete(brief: ProjectBrief): boolean {
  const readiness = briefReadiness(brief)
  return readiness.hasProjectInfo && readiness.hasNeeds
}

/** "2,4 MB" — cỡ tệp trên danh sách tài liệu đính kèm (S11). */
export function formatFileSize(document: BriefDocument, locale: string): string {
  const mb = document.sizeBytes / (1024 * 1024)
  const value = mb >= 1 ? mb : document.sizeBytes / 1024
  const unit = mb >= 1 ? 'MB' : 'KB'
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value)} ${unit}`
}
