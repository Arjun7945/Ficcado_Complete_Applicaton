/**
 * lib/enums.ts
 * Centralized Enum Registry and Exhaustiveness-Checked Display Label Maps
 * (Part 13.5 Specification).
 *
 * Every fixed dropdown in the application MUST use these enum values and label maps.
 * TypeScript exhaustiveness checking (Record<EnumType, string>) guarantees that if
 * a backend enum value is added or changed, the frontend fails to compile at build time
 * until a human label is added.
 */

// Helper to filter out legacy duplicate labels so select dropdowns display only unique options
export function getUniqueEnumOptions<T extends string>(
  labelMap: Record<T, string>
): Array<{ value: T; label: string }> {
  const seenLabels = new Set<string>();
  const options: Array<{ value: T; label: string }> = [];

  for (const [value, label] of Object.entries(labelMap) as Array<[T, string]>) {
    if (!seenLabels.has(label)) {
      seenLabels.add(label);
      options.push({ value, label });
    }
  }

  return options;
}

// 1. Item Status
export enum ItemStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  IN_STOCK = 'IN_STOCK',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  DISCONTINUED = 'DISCONTINUED',
}

export const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  [ItemStatus.ACTIVE]: 'In Stock',
  [ItemStatus.IN_STOCK]: 'In Stock',
  [ItemStatus.OUT_OF_STOCK]: 'Out of Stock',
  [ItemStatus.INACTIVE]: 'Inactive',
  [ItemStatus.DISCONTINUED]: 'Discontinued',
};

export const ITEM_STATUS_OPTIONS = getUniqueEnumOptions(ITEM_STATUS_LABELS);

// 2. Sale Status
export enum SaleStatus {
  COMPLETED = 'COMPLETED',
  REPLACE_REQUESTED = 'REPLACE_REQUESTED',
  REFUND_REQUESTED = 'REFUND_REQUESTED',
  PURCHASE_SATISFIED_AND_ORDER_COMPLETED = 'PURCHASE_SATISFIED_AND_ORDER_COMPLETED',
  NOT_PROVIDED_OR_ORDER_ONLY_PLACED = 'NOT_PROVIDED_OR_ORDER_ONLY_PLACED',
  RETURN_REFUND_ON_SPECIFIC_ITEMS = 'RETURN_REFUND_ON_SPECIFIC_ITEMS',
  RETURN_REFUND_ON_ALL_ITEMS = 'RETURN_REFUND_ON_ALL_ITEMS',
  REPLACEMENT_COMPLETED_AND_PURCHASE_SATISFIED = 'REPLACEMENT_COMPLETED_AND_PURCHASE_SATISFIED',
}

export const SALE_STATUS_LABELS: Record<SaleStatus, string> = {
  [SaleStatus.COMPLETED]: 'Purchase Satisfied and Order Completed',
  [SaleStatus.PURCHASE_SATISFIED_AND_ORDER_COMPLETED]: 'Purchase Satisfied and Order Completed',
  [SaleStatus.NOT_PROVIDED_OR_ORDER_ONLY_PLACED]: 'Not Provided / Order Only Placed',
  [SaleStatus.REPLACE_REQUESTED]: 'Replacement Requested',
  [SaleStatus.REFUND_REQUESTED]: 'Return/Refund Requested',
  [SaleStatus.RETURN_REFUND_ON_SPECIFIC_ITEMS]: 'Return/Refund on Specific Item(s)',
  [SaleStatus.RETURN_REFUND_ON_ALL_ITEMS]: 'Return/Refund on all Items',
  [SaleStatus.REPLACEMENT_COMPLETED_AND_PURCHASE_SATISFIED]: 'Replacement Completed and Purchase Satisfied',
};

export const SALE_STATUS_OPTIONS = getUniqueEnumOptions(SALE_STATUS_LABELS);

// 3. Delivery Status
export enum DeliveryStatus {
  PACKED_AND_READY_FOR_SHIPMENT = 'PACKED_AND_READY_FOR_SHIPMENT',
  IN_TRANSIT = 'IN_TRANSIT',
  ORDER_DELIVERED_SUCCESSFULLY = 'ORDER_DELIVERED_SUCCESSFULLY',
  ORDER_MISSING = 'ORDER_MISSING',
  ORDER_FAILED_TO_DELIVER_AND_RETURNING_BACK = 'ORDER_FAILED_TO_DELIVER_AND_RETURNING_BACK',
  SPECIFIC_ITEMS_RETURNING = 'SPECIFIC_ITEMS_RETURNING',
  ALL_ITEMS_RETURNING_BACK = 'ALL_ITEMS_RETURNING_BACK',
  DELIVERED = 'DELIVERED',
  PENDING = 'PENDING',
  FAILED = 'FAILED',
  RETURNED = 'RETURNED',
}

export const DELIVERY_STATUS_LABELS: Record<DeliveryStatus, string> = {
  [DeliveryStatus.PACKED_AND_READY_FOR_SHIPMENT]: 'Packed and Ready for Shipment',
  [DeliveryStatus.IN_TRANSIT]: 'In Transit',
  [DeliveryStatus.ORDER_DELIVERED_SUCCESSFULLY]: 'Order Delivered Successfully',
  [DeliveryStatus.DELIVERED]: 'Order Delivered Successfully',
  [DeliveryStatus.PENDING]: 'Packed and Ready for Shipment',
  [DeliveryStatus.ORDER_MISSING]: 'Order Missing',
  [DeliveryStatus.ORDER_FAILED_TO_DELIVER_AND_RETURNING_BACK]: 'Order Failed to Deliver and Returning Back',
  [DeliveryStatus.FAILED]: 'Order Failed to Deliver and Returning Back',
  [DeliveryStatus.SPECIFIC_ITEMS_RETURNING]: 'Specific Item(s) Returning',
  [DeliveryStatus.ALL_ITEMS_RETURNING_BACK]: 'All Items Returning Back',
  [DeliveryStatus.RETURNED]: 'All Items Returning Back',
};

export const DELIVERY_STATUS_OPTIONS = getUniqueEnumOptions(DELIVERY_STATUS_LABELS);

// 4. Payment Status
export enum PaymentStatus {
  PAID = 'PAID',
  UNPAID = 'UNPAID',
  NOT_PAID = 'NOT_PAID',
  CREDIT = 'CREDIT',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  [PaymentStatus.PAID]: 'Paid',
  [PaymentStatus.UNPAID]: 'Not Paid',
  [PaymentStatus.NOT_PAID]: 'Not Paid',
  [PaymentStatus.CREDIT]: 'Credit',
  [PaymentStatus.PARTIALLY_PAID]: 'Partially Paid',
};

export const PAYMENT_STATUS_OPTIONS = getUniqueEnumOptions(PAYMENT_STATUS_LABELS);

// 5. Payment Mode / Mode of Payment
export enum PaymentMode {
  CASH = 'CASH',
  UPI = 'UPI',
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

export const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  [PaymentMode.CASH]: 'Cash',
  [PaymentMode.UPI]: 'UPI',
  [PaymentMode.CARD]: 'Card',
  [PaymentMode.BANK_TRANSFER]: 'Bank Transfer',
};

export const PAYMENT_MODE_OPTIONS = getUniqueEnumOptions(PAYMENT_MODE_LABELS);

// 6. Replacement Status
export enum ReplacementStatus {
  REPLACEMENT_APPROVED = 'REPLACEMENT_APPROVED',
  REPLACEMENT_DISPATCHED = 'REPLACEMENT_DISPATCHED',
  REPLACEMENT_RECEIVED = 'REPLACEMENT_RECEIVED',
  SATISFIED_AND_COMPLETED = 'SATISFIED_AND_COMPLETED',
  APPROVED = 'APPROVED',
  DISPATCHED = 'DISPATCHED',
  RECEIVED = 'RECEIVED',
}

export const REPLACEMENT_STATUS_LABELS: Record<ReplacementStatus, string> = {
  [ReplacementStatus.REPLACEMENT_APPROVED]: 'Replacement Approved',
  [ReplacementStatus.APPROVED]: 'Replacement Approved',
  [ReplacementStatus.REPLACEMENT_DISPATCHED]: 'Replacement Dispatched',
  [ReplacementStatus.DISPATCHED]: 'Replacement Dispatched',
  [ReplacementStatus.REPLACEMENT_RECEIVED]: 'Replacement Received',
  [ReplacementStatus.RECEIVED]: 'Replacement Received',
  [ReplacementStatus.SATISFIED_AND_COMPLETED]: 'Satisfied / Completed Order',
};

export const REPLACEMENT_STATUS_OPTIONS = getUniqueEnumOptions(REPLACEMENT_STATUS_LABELS);

// 7. Item Verification Status
export enum ItemVerificationStatus {
  GOOD_ACCEPTED_FOR_RETURN = 'GOOD_ACCEPTED_FOR_RETURN',
  DAMAGED_CANNOT_ACCEPT_RETURN = 'DAMAGED_CANNOT_ACCEPT_RETURN',
  NOT_RECEIVED_IN_TRANSIT = 'NOT_RECEIVED_IN_TRANSIT',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export const ITEM_VERIFICATION_STATUS_LABELS: Record<ItemVerificationStatus, string> = {
  [ItemVerificationStatus.GOOD_ACCEPTED_FOR_RETURN]: 'Good — Accepted for Return',
  [ItemVerificationStatus.DAMAGED_CANNOT_ACCEPT_RETURN]: 'Damaged — Cannot Accept Return',
  [ItemVerificationStatus.NOT_RECEIVED_IN_TRANSIT]: 'Not Received — In Transit',
  [ItemVerificationStatus.PENDING]: 'Pending Verification',
  [ItemVerificationStatus.VERIFIED]: 'Good — Accepted for Return',
  [ItemVerificationStatus.REJECTED]: 'Damaged — Cannot Accept Return',
};

export const ITEM_VERIFICATION_STATUS_OPTIONS = getUniqueEnumOptions(ITEM_VERIFICATION_STATUS_LABELS);

// 8. Item Disposition Path
export enum DispositionOfItems {
  RETURNED_TO_INVENTORY = 'RETURNED_TO_INVENTORY',
  SENT_TO_DAMAGED_PRODUCTS = 'SENT_TO_DAMAGED_PRODUCTS',
  RETURN_TO_STOCK = 'RETURN_TO_STOCK',
  SEND_TO_DAMAGED_LOG = 'SEND_TO_DAMAGED_LOG',
}

export const DISPOSITION_OF_ITEMS_LABELS: Record<DispositionOfItems, string> = {
  [DispositionOfItems.RETURNED_TO_INVENTORY]: 'Return to Inventory/Warehouse Stock',
  [DispositionOfItems.RETURN_TO_STOCK]: 'Return to Inventory/Warehouse Stock',
  [DispositionOfItems.SENT_TO_DAMAGED_PRODUCTS]: 'Send to Damaged Products Log',
  [DispositionOfItems.SEND_TO_DAMAGED_LOG]: 'Send to Damaged Products Log',
};

export const DISPOSITION_OF_ITEMS_OPTIONS = getUniqueEnumOptions(DISPOSITION_OF_ITEMS_LABELS);

// 9. Refund Status
export enum RefundStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  APPROVED = 'APPROVED',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CLOSED = 'CLOSED',
}

export const REFUND_STATUS_LABELS: Record<RefundStatus, string> = {
  [RefundStatus.PENDING]: 'Pending',
  [RefundStatus.IN_PROGRESS]: 'In Progress',
  [RefundStatus.APPROVED]: 'Approved',
  [RefundStatus.COMPLETED]: 'Completed',
  [RefundStatus.REJECTED]: 'Rejected',
  [RefundStatus.CLOSED]: 'Closed',
};

export const REFUND_STATUS_OPTIONS = getUniqueEnumOptions(REFUND_STATUS_LABELS);

// 10. Return Reason
export enum ReturnReason {
  WRONG_SIZE_FIT = 'WRONG_SIZE_FIT',
  DAMAGED_OR_DEFECTIVE_PRODUCT = 'DAMAGED_OR_DEFECTIVE_PRODUCT',
  WRONG_PRODUCT_RECEIVED = 'WRONG_PRODUCT_RECEIVED',
  PRODUCT_DOES_NOT_MATCH_DESCRIPTION = 'PRODUCT_DOES_NOT_MATCH_DESCRIPTION',
  NOT_SATISFIED_WITH_QUALITY = 'NOT_SATISFIED_WITH_QUALITY',
  OTHER = 'OTHER',
}

export const RETURN_REASON_LABELS: Record<ReturnReason, string> = {
  [ReturnReason.WRONG_SIZE_FIT]: 'Wrong Size / Fit',
  [ReturnReason.DAMAGED_OR_DEFECTIVE_PRODUCT]: 'Damaged or Defective Product',
  [ReturnReason.WRONG_PRODUCT_RECEIVED]: 'Wrong Product Received',
  [ReturnReason.PRODUCT_DOES_NOT_MATCH_DESCRIPTION]: "Product Doesn't Match Description / Photos",
  [ReturnReason.NOT_SATISFIED_WITH_QUALITY]: 'Not Satisfied with Quality',
  [ReturnReason.OTHER]: 'Other',
};

export const RETURN_REASON_OPTIONS = getUniqueEnumOptions(RETURN_REASON_LABELS);

// 11. Expense Category
export enum ExpenseCategory {
  FUEL_EXPENSE = 'FUEL_EXPENSE',
  PRINTING_EXP = 'PRINTING_EXP',
  TRAVEL_EXP = 'TRAVEL_EXP',
  FOOD_EXP = 'FOOD_EXP',
  TIP_EXP = 'TIP_EXP',
  PURCHASE_ON_GOODS_EXP = 'PURCHASE_ON_GOODS_EXP',
  ADVERTISING_EXP = 'ADVERTISING_EXP',
  VENDOR_SOURCING_TRAVEL = 'VENDOR_SOURCING_TRAVEL',
  PRINTING = 'PRINTING',
  MARKETING_PROMOTION = 'MARKETING_PROMOTION',
  PACKING = 'PACKING',
  OTHER = 'OTHER',
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  [ExpenseCategory.FUEL_EXPENSE]: 'Fuel Expense',
  [ExpenseCategory.PRINTING_EXP]: 'Printing Exp',
  [ExpenseCategory.TRAVEL_EXP]: 'Travel Exp',
  [ExpenseCategory.FOOD_EXP]: 'Food Exp',
  [ExpenseCategory.TIP_EXP]: 'Tip Exp',
  [ExpenseCategory.PURCHASE_ON_GOODS_EXP]: 'Purchase on Goods Exp',
  [ExpenseCategory.ADVERTISING_EXP]: 'Advertising Exp',
  [ExpenseCategory.VENDOR_SOURCING_TRAVEL]: 'Travel Exp',
  [ExpenseCategory.PRINTING]: 'Printing Exp',
  [ExpenseCategory.MARKETING_PROMOTION]: 'Advertising Exp',
  [ExpenseCategory.PACKING]: 'Purchase on Goods Exp',
  [ExpenseCategory.OTHER]: 'Other',
};

export const EXPENSE_CATEGORY_OPTIONS = getUniqueEnumOptions(EXPENSE_CATEGORY_LABELS);

// 12. Vendor Type
export enum VendorType {
  COURIER_PARTNER = 'COURIER_PARTNER',
  DESIGNER_TEAM = 'DESIGNER_TEAM',
  PRINTING_PARTNER = 'PRINTING_PARTNER',
  MARKETING_PARTNERS = 'MARKETING_PARTNERS',
  PACKING_TEAM = 'PACKING_TEAM',
  STOCK_MANAGEMENT_TEAM = 'STOCK_MANAGEMENT_TEAM',
  TRANSPORTATION_TEAM = 'TRANSPORTATION_TEAM',
  HANDLER_TEAM = 'HANDLER_TEAM',
  DESIGNER = 'DESIGNER',
  PRINTING = 'PRINTING',
  MARKETING = 'MARKETING',
  OTHER = 'OTHER',
}

export const VENDOR_TYPE_LABELS: Record<VendorType, string> = {
  [VendorType.COURIER_PARTNER]: 'Courier Partner',
  [VendorType.DESIGNER_TEAM]: 'Designer Team',
  [VendorType.PRINTING_PARTNER]: 'Printing Partner',
  [VendorType.MARKETING_PARTNERS]: 'Marketing Partners',
  [VendorType.PACKING_TEAM]: 'Packing Team',
  [VendorType.STOCK_MANAGEMENT_TEAM]: 'Stock Management Team',
  [VendorType.TRANSPORTATION_TEAM]: 'Transportation Team',
  [VendorType.HANDLER_TEAM]: 'Handler Team',
  [VendorType.DESIGNER]: 'Designer Team',
  [VendorType.PRINTING]: 'Printing Partner',
  [VendorType.MARKETING]: 'Marketing Partners',
  [VendorType.OTHER]: 'Other',
};

export const VENDOR_TYPE_OPTIONS = getUniqueEnumOptions(VENDOR_TYPE_LABELS);

// 13. Admin Role
export enum AdminRole {
  ADMIN = 'ADMIN',
  SUPERADMIN = 'SUPERADMIN',
}

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  [AdminRole.ADMIN]: 'Admin',
  [AdminRole.SUPERADMIN]: 'Superadmin',
};

export const ADMIN_ROLE_OPTIONS = getUniqueEnumOptions(ADMIN_ROLE_LABELS);

// 14. Profitability Period
export enum ProfitabilityPeriod {
  TODAY = 'TODAY',
  LAST_7_DAYS = 'LAST_7_DAYS',
  THIS_MONTH = 'THIS_MONTH',
  CUSTOM = 'CUSTOM',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
}

export const PROFITABILITY_PERIOD_LABELS: Record<ProfitabilityPeriod, string> = {
  [ProfitabilityPeriod.TODAY]: 'Today',
  [ProfitabilityPeriod.LAST_7_DAYS]: 'Last 7 Days',
  [ProfitabilityPeriod.THIS_MONTH]: 'This Month',
  [ProfitabilityPeriod.CUSTOM]: 'Custom Range',
  [ProfitabilityPeriod.DAILY]: 'Today',
  [ProfitabilityPeriod.WEEKLY]: 'Last 7 Days',
  [ProfitabilityPeriod.MONTHLY]: 'This Month',
};

export const PROFITABILITY_PERIOD_OPTIONS = getUniqueEnumOptions(PROFITABILITY_PERIOD_LABELS);

// 15. Fulfilment Source
export enum FulfilmentSource {
  TAKE_FROM_INVENTORY = 'TAKE_FROM_INVENTORY',
  WAREHOUSE_HANDLER = 'WAREHOUSE_HANDLER',
}

export const FULFILMENT_SOURCE_LABELS: Record<FulfilmentSource, string> = {
  [FulfilmentSource.TAKE_FROM_INVENTORY]: 'Take from Inventory',
  [FulfilmentSource.WAREHOUSE_HANDLER]: 'Warehouse Handler',
};

export const FULFILMENT_SOURCE_OPTIONS = getUniqueEnumOptions(FULFILMENT_SOURCE_LABELS);

// 16. Notification Setting
export enum NotificationSetting {
  ENABLED = 'ENABLED',
  DISABLED = 'DISABLED',
}

export const NOTIFICATION_SETTING_LABELS: Record<NotificationSetting, string> = {
  [NotificationSetting.ENABLED]: 'Enabled',
  [NotificationSetting.DISABLED]: 'Disabled',
};

export const NOTIFICATION_SETTING_OPTIONS = getUniqueEnumOptions(NOTIFICATION_SETTING_LABELS);
