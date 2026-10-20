// =============================================================================
// Courier Partners Data Layer — /src/lib/couriers.ts
// Single source of truth for delivery options via the API client layer.
// Google Sheets integration completely removed.
// =============================================================================

export {
  getCourierPartners,
  getCourierPartnerById,
  type CourierOption,
} from '@/lib/api/couriers';
