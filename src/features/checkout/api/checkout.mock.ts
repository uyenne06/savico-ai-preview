import { cmsDb } from '@/shared/cms'
import { mockDelay } from '@/shared/lib/mock'
import { DISCOUNT_CODES, QR_TTL_MINUTES } from '../constants/checkout.constants'
import type { CreateOrderPayload, Order, OrderProduct, TransferInfo } from '../types/checkout.types'

/**
 * Mock trong trình duyệt của luồng mua gói (S03–S08), bật bằng
 * `NEXT_PUBLIC_USE_MOCK_API=true`.
 *
 * Đơn nằm ở `localStorage` vì luồng đi qua nhiều lần tải trang (QR → đang xác
 * nhận → hoàn tất) và người dùng hoàn toàn có thể F5 giữa chừng — mà đúng lúc
 * đó thì mất đơn là mất cả tiền đã chuyển.
 *
 * Tài khoản nhận là số MINH HỌA. Backend thật trả về tài khoản định danh theo
 * từng đơn để đối soát tự động.
 */
const STORE_KEY = 'savico.mock-checkout'

/** Sau khi khách bấm "Tôi đã chuyển khoản", mock coi như ngân hàng báo có sau ngần này. */
const CONFIRM_DELAY_MS = 8_000

interface MockStore {
  sequence: number
  orders: Record<string, Order>
  /** Thời điểm bấm "Tôi đã chuyển khoản" của từng đơn, để mô phỏng đối soát. */
  transferredAt: Record<string, number>
}

const emptyStore = (): MockStore => ({ sequence: 0, orders: {}, transferredAt: {} })

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

/** Mã đơn `SVC-YYNNN` như trên bản mô tả (#SVC-24001). */
function nextOrderId(store: MockStore): string {
  store.sequence += 1
  const year = String(new Date().getFullYear()).slice(-2)
  return `SVC-${year}${String(store.sequence).padStart(3, '0')}`
}

function transferInfo(orderId: string, amount: number): TransferInfo {
  const content = orderId.replace(/-/g, '')
  return {
    bankName: 'Vietcombank',
    accountNumber: '1028 6688 999',
    accountName: 'CÔNG TY CỔ PHẦN SAVICO',
    content,
    // Chuỗi QR mô phỏng: đủ thông tin để quét ra nội dung đúng khi soi bằng mắt,
    // không phải chuẩn VietQR thật.
    qrPayload: `SAVICO|VCB|10286688999|${amount}|${content}|${Date.now()}`
  }
}

/** Bản chụp sản phẩm từ kho nội dung — giá đổi sau đó không làm đơn cũ đổi theo. */
function productSnapshot(payload: CreateOrderPayload): OrderProduct {
  if (payload.kind === 'design') {
    const plan = cmsDb.list('plans').find((item) => item.id === payload.productId)
    if (!plan) throw new Error(`Mock: không tìm thấy gói thiết kế ${payload.productId}`)
    return {
      id: plan.id,
      kind: 'design',
      name: plan.tier,
      price: plan.price,
      // Hình S03: ba dòng quyền lợi trong thẻ đơn hàng là SỐ LƯỢT của gói
      // (phương án · lượt chỉnh sửa · lượt tra thư viện), không phải ba tính
      // năng đầu tiên — cắt `features` thì dòng thứ ba ra "Dự toán nội thất".
      benefits: [
        `${plan.designCredits} phương án thiết kế`,
        `${plan.designCredits} lượt chỉnh sửa phương án`,
        `${plan.libraryCredits} lượt tra cứu thư viện mẫu`
      ]
    }
  }

  const supervision = cmsDb.list('supervisionPackages').find((item) => item.id === payload.productId)
  if (!supervision) throw new Error(`Mock: không tìm thấy gói giám sát ${payload.productId}`)
  return {
    id: supervision.id,
    kind: 'supervision',
    name: supervision.tier,
    price: supervision.price,
    benefits: supervision.benefits.slice(0, 3)
  }
}

/** Tính lại tiền sau khi áp mã giảm giá. */
function priceOf(price: number, code: string) {
  const percent = DISCOUNT_CODES[code.trim().toUpperCase()] ?? 0
  const discountAmount = Math.round((price * percent) / 100)
  return { discountPercent: percent, discountAmount, total: price - discountAmount }
}

function expiryFromNow(): string {
  return new Date(Date.now() + QR_TTL_MINUTES * 60_000).toISOString()
}

export const mockCheckoutApi = {
  createOrder: async (payload: CreateOrderPayload): Promise<Order> => {
    await mockDelay(350)
    const store = loadStore()
    const product = productSnapshot(payload)
    const { discountPercent, discountAmount, total } = priceOf(product.price, payload.discountCode)
    const id = nextOrderId(store)

    const order: Order = {
      id,
      product,
      ...(payload.projectId ? { projectId: payload.projectId } : {}),
      buyer: payload.buyer,
      invoice: payload.invoice,
      discountCode: discountPercent > 0 ? payload.discountCode.trim().toUpperCase() : '',
      discountPercent,
      subtotal: product.price,
      discountAmount,
      total,
      status: 'awaiting',
      createdAt: new Date().toISOString(),
      expiresAt: expiryFromNow(),
      transfer: transferInfo(id, total)
    }

    store.orders[id] = order
    saveStore(store)
    return order
  },

  getOrder: async (orderId: string): Promise<Order> => {
    await mockDelay(150)
    const store = loadStore()
    const order = store.orders[orderId]
    if (!order) throw new Error(`Mock: không tìm thấy đơn hàng ${orderId}`)

    // Mô phỏng đối soát ngân hàng: đơn đang chờ xác nhận đủ lâu thì báo có.
    const startedAt = store.transferredAt[orderId]
    if (order.status === 'verifying' && startedAt && Date.now() - startedAt >= CONFIRM_DELAY_MS) {
      const paid: Order = { ...order, status: 'paid' }
      store.orders[orderId] = paid
      saveStore(store)
      return paid
    }

    // Hết hạn mã QR mà chưa chuyển khoản → màn "Chưa nhận được thanh toán" (S07).
    if (order.status === 'awaiting' && new Date(order.expiresAt).getTime() < Date.now()) {
      const failed: Order = { ...order, status: 'failed' }
      store.orders[orderId] = failed
      saveStore(store)
      return failed
    }

    return order
  },

  markTransferred: async (orderId: string): Promise<Order> => {
    await mockDelay(250)
    const store = loadStore()
    const order = store.orders[orderId]
    if (!order) throw new Error(`Mock: không tìm thấy đơn hàng ${orderId}`)

    const updated: Order = { ...order, status: 'verifying', verifyingStartedAt: new Date().toISOString() }
    store.orders[orderId] = updated
    store.transferredAt[orderId] = Date.now()
    saveStore(store)
    return updated
  },

  regenerateQr: async (orderId: string): Promise<Order> => {
    await mockDelay(250)
    const store = loadStore()
    const order = store.orders[orderId]
    if (!order) throw new Error(`Mock: không tìm thấy đơn hàng ${orderId}`)

    const updated: Order = {
      ...order,
      status: 'awaiting',
      expiresAt: expiryFromNow(),
      transfer: transferInfo(order.id, order.total)
    }
    delete updated.verifyingStartedAt
    store.orders[orderId] = updated
    delete store.transferredAt[orderId]
    saveStore(store)
    return updated
  }
}
