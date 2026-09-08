/**
 * types/api.ts
 * Authoritative TypeScript types derived directly from OpenAPI 3.1.0 Specification.
 * Single Source of Truth (SSOT) contract between Spring Boot backend and Next.js frontend.
 */

import {
  ItemStatus,
  SaleStatus,
  DeliveryStatus,
  PaymentStatus,
  PaymentMode,
  ReplacementStatus,
  ItemVerificationStatus,
  DispositionOfItems,
  RefundStatus,
  ReturnReason,
  ExpenseCategory,
  FulfilmentSource,
  AdminRole,
  NotificationSetting
} from '@/lib/enums';

// Re-export enums for API consumers
export {
  ItemStatus,
  SaleStatus,
  DeliveryStatus,
  PaymentStatus,
  PaymentMode,
  ReplacementStatus,
  ItemVerificationStatus,
  DispositionOfItems,
  RefundStatus,
  ReturnReason,
  ExpenseCategory,
  FulfilmentSource,
  AdminRole,
  NotificationSetting
};

// ── Authentication & Admins ───────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AdminSummary {
  id: number;
  adminName: string;
  emailId: string;
  role: AdminRole | string;
  notifications: NotificationSetting | string;
}

export interface AdminResponse {
  id: number;
  adminName: string;
  emailId: string;
  phoneNumber?: string;
  role: AdminRole | string;
  notifications: NotificationSetting | string;
  isActive: boolean;
  createdAt: string;
}

export interface AdminCreateRequest {
  adminName: string;
  emailId: string;
  phoneNumber?: string;
  password: string;
  role: AdminRole | string;
}

export interface AdminUpdateRequest {
  adminName: string;
  phoneNumber?: string;
  notifications?: NotificationSetting | string;
  password?: string;
  isActive?: boolean;
}

// ── Customers ─────────────────────────────────────────────────────────────────

export interface CustomerAddress {
  id: number;
  address: string;
  isDefault: boolean;
  createdAt?: string;
}

export interface CustomerResponse {
  id: number;
  customerName: string;
  phoneNumber: string;
  emailId?: string;
  totalOrdersPlaced: number;
  addresses?: CustomerAddress[];
  createdAt: string;
}

// ── Items & Images ────────────────────────────────────────────────────────────

export interface ItemSizeResponse {
  id: number;
  size: string;
}

export interface ItemImageResponse {
  id: number;
  imageUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  displayOrder: number;
  uploadedAt: string;
}

export interface ItemResponse {
  id: number;
  itemName: string;
  itemType: string;
  priceOfItem: number;
  costPrice: number;
  currentStatus: ItemStatus | string;
  sizes?: ItemSizeResponse[];
  images?: ItemImageResponse[];
  averageRating?: number;
  reviewCount?: number;
  createdAt: string;
}

export interface ItemRequest {
  itemName: string;
  itemType: string;
  priceOfItem: number;
  costPrice?: number;
  currentStatus: ItemStatus | string;
  sizes?: string[];
}

export interface QuantityAdjustRequest {
  itemId: number;
  size: string;
  delta: number;
  reason?: string;
}

// ── Inventory ─────────────────────────────────────────────────────────────────

export interface InventoryResponse {
  id: number;
  itemId: number;
  itemName: string;
  size: string;
  quantity: number;
  updatedAt: string;
}

export interface InventoryRequest {
  itemId: number;
  size: string;
  quantity: number;
}

export interface UnallocatedResponse {
  itemId: number;
  size: string;
  unallocatedQuantity: number;
}

// ── Warehouse Allocations ─────────────────────────────────────────────────────

export interface WarehouseResponse {
  id: number;
  itemId: number;
  itemName: string;
  size: string;
  quantity: number;
  handlerAdminId: number;
  handlerAdminName: string;
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseRequest {
  itemId: number;
  size: string;
  quantity: number;
  handlerAdminId: number;
}

// ── Sales & Invoicing ─────────────────────────────────────────────────────────

export interface SaleLineItemResponse {
  id: number;
  itemId: number;
  itemName: string;
  size: string;
  quantity: number;
  priceEach: number;
  totalPrice: number;
}

export interface SaleLineItemRequest {
  itemId: number;
  size: string;
  quantity: number;
  priceEach: number;
}

export interface SaleResponse {
  id: number;
  invoiceNumber: string;
  customerId?: number;
  customerName: string;
  customerPhoneNumber: string;
  customerAddress?: string;
  customerEmail?: string;
  saleStatus: SaleStatus | string;
  paymentStatus: PaymentStatus | string;
  modeOfPayment?: PaymentMode | string;
  transactionId?: string;
  deliveryStatus: DeliveryStatus | string;
  deliveryChargeEnabled?: boolean;
  deliveryChargeAmount?: number;
  fulfilmentRequestStatus?: string;
  fulfilmentSource?: FulfilmentSource | string;
  discount?: number;
  totalAmount: number;
  receivedBy?: string;
  remarks?: string;
  version?: number;
  lineItems: SaleLineItemResponse[];
  createdAt: string;
  updatedAt: string;
}

export interface SaleRequest {
  customerId?: number;
  customerName: string;
  customerPhoneNumber: string;
  customerAddress?: string;
  customerEmail?: string;
  saleStatus: SaleStatus | string;
  paymentStatus: PaymentStatus | string;
  modeOfPayment?: PaymentMode | string;
  transactionId?: string;
  deliveryStatus: DeliveryStatus | string;
  deliveryChargeEnabled?: boolean;
  deliveryChargeAmount?: number;
  fulfilmentSource?: FulfilmentSource | string;
  discount?: number;
  totalAmount: number;
  receivedBy?: string;
  remarks?: string;
  lineItems: SaleLineItemRequest[];
}

// ── Replacements ──────────────────────────────────────────────────────────────

export interface ReplacementResponse {
  id: number;
  saleId: number;
  invoiceNumber: string;
  replacementStatus: ReplacementStatus | string;
  requestedItemId: number;
  requestedItemName: string;
  requestedSize: string;
  requestedQuantity: number;
  replacementItemId?: number;
  replacementItemName?: string;
  replacementSize?: string;
  replacementQuantity?: number;
  reason?: string;
  dispositionOfOriginal?: DispositionOfItems | string;
  createdAt: string;
  updatedAt: string;
}

export interface ReplacementRequest {
  saleId: number;
  requestedItemId: number;
  requestedSize: string;
  requestedQuantity: number;
  replacementItemId?: number;
  replacementSize?: string;
  replacementQuantity?: number;
  reason?: string;
}

export interface StatusRequest {
  status: ReplacementStatus | string;
}

// ── Return & Refunds ──────────────────────────────────────────────────────────

export interface ReturnRefundResponse {
  id: number;
  saleId: number;
  invoiceNumber: string;
  refundStatus: RefundStatus | string;
  itemVerificationStatus: ItemVerificationStatus | string;
  refundAmount?: number;
  modeOfRefund?: string;
  dispositionOfItems?: DispositionOfItems | string;
  returnReason?: ReturnReason | string;
  reasonNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReturnRefundRequest {
  saleId: number;
  returnReason: ReturnReason | string;
  reasonNotes?: string;
  refundAmount?: number;
}

export interface ReturnRefundUpdateRequest {
  refundStatus?: RefundStatus | string;
  itemVerificationStatus?: ItemVerificationStatus | string;
  refundAmount?: number;
  modeOfRefund?: string;
  dispositionOfItems?: DispositionOfItems | string;
  reasonNotes?: string;
}

// ── Damaged Products ──────────────────────────────────────────────────────────

export interface DamagedProductResponse {
  id: number;
  invoiceNumber?: string;
  saleId?: number;
  itemId: number;
  itemName: string;
  size: string;
  quantity: number;
  customerName?: string;
  reasonNotes?: string;
  source?: string;
  createdAt: string;
}

export interface DamagedProductRequest {
  saleId?: number;
  itemId: number;
  size: string;
  quantity: number;
  reasonNotes?: string;
}

// ── Expenses ──────────────────────────────────────────────────────────────────

export interface ExpenseResponse {
  id: number;
  category: ExpenseCategory | string;
  amount: number;
  paymentMode: PaymentMode | string;
  note?: string;
  spentAt: string;
  createdAt: string;
}

export interface ExpenseRequest {
  category: ExpenseCategory | string;
  amount: number;
  paymentMode: PaymentMode | string;
  note?: string;
  spentAt?: string;
}

// ── Vendors ───────────────────────────────────────────────────────────────────

export interface PaymentResponse {
  id: number;
  vendorId: number;
  amount: number;
  modeOfPayment: PaymentMode | string;
  transactionReference?: string;
  note?: string;
  paymentDate: string;
}

export interface PaymentRequest {
  amount: number;
  modeOfPayment: PaymentMode | string;
  transactionReference?: string;
  note?: string;
  paymentDate?: string;
}

export interface VendorResponse {
  id: number;
  vendorName: string;
  contactPerson?: string;
  primaryPhone?: string;
  alternatePhone?: string;
  address?: string;
  gstNumber?: string;
  notes?: string;
  totalPaidToVendor?: number;
  createdAt: string;
}

export interface VendorRequest {
  vendorName: string;
  contactPerson?: string;
  primaryPhone?: string;
  alternatePhone?: string;
  address?: string;
  gstNumber?: string;
  notes?: string;
}

// ── Keep Notes ────────────────────────────────────────────────────────────────

export interface NoteResponse {
  id: number;
  title: string;
  content: string;
  color?: string;
  isPinned?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NoteRequest {
  title: string;
  content: string;
  color?: string;
  isPinned?: boolean;
}

// ── Reviews ───────────────────────────────────────────────────────────────────

export interface ReviewResponse {
  id: number;
  itemId: number;
  customerName: string;
  starRating: number;
  comment?: string;
  submittedAt: string;
}

export interface SubmitReviewRequest {
  token: string;
  starRating: number;
  comment?: string;
}

export interface ReviewTokenValidationResponse {
  valid: boolean;
  saleId?: number;
  customerName?: string;
  itemName?: string;
}

// ── Audit Logs ────────────────────────────────────────────────────────────────

export interface ActivityLogResponse {
  id: number;
  adminName?: string;
  action: string;
  module: string;
  entityType?: string;
  entityId?: string;
  details?: string;
  timestamp: string;
}

export interface SalesLogResponse {
  id: number;
  module: string;
  operation: string;
  relatedInvoiceNumber?: string;
  summary: string;
  narrativeText?: string;
  performedByAdminName?: string;
  timestamp: string;
}

export interface InventoryHistoryResponse {
  id: number;
  itemId: number;
  itemName: string;
  size: string;
  delta: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  relatedInvoiceNumber?: string;
  performedByAdminName?: string;
  timestamp: string;
}

// ── Reports ───────────────────────────────────────────────────────────────────

export interface ProfitabilityReportResponse {
  grossRevenue: number;
  netRevenue: number;
  cogs: number;
  grossProfit: number;
  operationalExpenses: number;
  vendorPayments: number;
  totalExpenses: number;
  netProfit: number;
  discountsProvided: number;
  unpaidDues: number;
  totalRefunded: number;
}
