import { z } from 'zod'

import { CONSTRUCTION_SCOPES, PROJECT_SCALES, SITE_CONDITIONS, START_WINDOWS } from '../constants/contractors.constants'

/** Resolved, localized validation messages injected into the schema. */
export interface BriefSchemaMessages {
  required: string
  nameMaxLength: string
  areaPositive: string
  budgetPositive: string
  noteRequired: string
  noteMaxLength: string
}

/** Số dương, cho phép dấu phân cách nhóm người dùng gõ vào (1.850.000.000). */
const POSITIVE_NUMBER = /^[1-9][\d.,\s]*$/

export const BRIEF_NAME_MAX_LENGTH = 120
export const BRIEF_NOTE_MAX_LENGTH = 1000

/**
 * Bước 1 — Tự tạo hồ sơ dự án (S10).
 *
 * Các trường có dấu * trên giao diện là bắt buộc: tên dự án, loại công trình,
 * diện tích đất, hiện trạng, địa chỉ, ngân sách dự kiến, phạm vi thi công và mô
 * tả nhu cầu. Số tầng/tum bắt buộc với loại nhà nhưng ẩn với căn hộ. "Dự kiến
 * khởi công" và tài liệu đính kèm không bắt buộc.
 */
export function createBriefSchema(m: BriefSchemaMessages) {
  return z
    .object({
      name: z.string().trim().min(1, { message: m.required }).max(BRIEF_NAME_MAX_LENGTH, { message: m.nameMaxLength }),
      buildingType: z.string().trim().min(1, { message: m.required }),
      /** Mã CMS dùng để áp đúng các trường điều kiện; nhãn vẫn được lưu để hiển thị hồ sơ. */
      buildingTypeId: z.string().nullable(),
      // Giữ dạng chuỗi: ô nhập trả về string, ép kiểu ngay trong schema sẽ làm
      // kiểu của form lệch với kiểu của input. Chuyển sang số ở lúc submit.
      landArea: z.string().trim().regex(POSITIVE_NUMBER, { message: m.areaPositive }),
      siteCondition: z.enum(SITE_CONDITIONS),
      scale: z.enum(PROJECT_SCALES).nullable(),
      hasAttic: z.boolean().nullable(),
      // Chỉ giữ MÃ hành chính trong form; tên tỉnh/phường tra lại từ danh mục lúc
      // lưu. Giữ cả hai trong form thì chúng lệch nhau ngay lần đầu người dùng đổi
      // tỉnh mà quên cập nhật tên.
      provinceCode: z.string().min(1, { message: m.required }),
      wardCode: z.string().min(1, { message: m.required }),
      street: z.string().trim().min(1, { message: m.required }),
      budget: z.string().trim().regex(POSITIVE_NUMBER, { message: m.budgetPositive }),
      startWindow: z.enum(START_WINDOWS),
      scope: z.enum(CONSTRUCTION_SCOPES),
      scopeNote: z
        .string()
        .trim()
        .min(1, { message: m.noteRequired })
        .max(BRIEF_NOTE_MAX_LENGTH, { message: m.noteMaxLength })
    })
    .superRefine((values, context) => {
      // Đồng bộ với luồng Tạo dự án mới: căn hộ chỉ có một mặt sàn và không có tum.
      if (!values.buildingType || values.buildingTypeId === 'apartment') return

      if (!values.scale) {
        context.addIssue({ code: 'custom', path: ['scale'], message: m.required })
      }
      if (values.hasAttic === null) {
        context.addIssue({ code: 'custom', path: ['hasAttic'], message: m.required })
      }
    })
}

export type BriefFormValues = z.infer<ReturnType<typeof createBriefSchema>>

/** "1.850.000.000" → 1850000000. Bỏ mọi ký tự không phải chữ số. */
export function parseAmount(value: string): number {
  return Number(value.replace(/\D/g, '')) || 0
}
