// =============================================================================
// Courier & Delivery Options API — /src/lib/api/couriers.ts
// Replaces previous Google Sheets 'Courier Partners' tab integration.
// =============================================================================

export interface CourierOption {
  id: string;
  name: string;
  rate: number; // 0 = Free delivery
  deliveryTime?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

const DEFAULT_COURIERS: CourierOption[] = [
  {
    id: 'del-standard',
    name: 'Express Surface Logistics',
    rate: 0,
    deliveryTime: '3–5 Business Days',
    status: 'ACTIVE',
  },
  {
    id: 'del-priority',
    name: 'Priority Air Courier',
    rate: 99,
    deliveryTime: '1–2 Business Days',
    status: 'ACTIVE',
  },
];

/**
 * Fetches active delivery / courier partner options.
 */
export async function getCourierPartners(): Promise<CourierOption[]> {
  return DEFAULT_COURIERS.filter((c) => c.status === 'ACTIVE');
}

/**
 * Looks up active courier partner by ID.
 */
export async function getCourierPartnerById(id: string): Promise<CourierOption | undefined> {
  const all = await getCourierPartners();
  return all.find((c) => c.id === id);
}
