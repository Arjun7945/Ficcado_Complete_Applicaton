// =============================================================================
// Ficcado Clothing — TypeScript Domain Interfaces
// Refactored per REFACTOR_ON_PREVIOUS_UPDATE.md:
// - Category list: 6 official slugs ('t-shirts', 'combos', 'shirts', 'hoodies', 'pants', 'sneakers')
// - Unisex catalog: no gender/audience/ageGroup fields
// - Modals: productModal, cartDrawer, filterModal, reviewsModal, deliveryModal, aboutModal, mobileMenuDrawer
// =============================================================================

// ---------------------------------------------------------------------------
// Primitives & Enumerations
// ---------------------------------------------------------------------------

export type ClothingCategory =
  | 't-shirts'
  | 'combos'
  | 'shirts'
  | 'hoodies'
  | 'pants'
  | 'sneakers';

export type SizeOption = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'UK-7' | 'UK-8' | 'UK-9' | 'UK-10' | string;

export type ModalId =
  | 'productModal'
  | 'cartDrawer'
  | 'filterModal'
  | 'aboutModal'
  | 'mobileMenuDrawer'
  | null;

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

export interface CourierOption {
  id: string;
  name: string;
  rate: number;
  deliveryTime?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

// ---------------------------------------------------------------------------
// Product Catalog
// ---------------------------------------------------------------------------

export interface Product {
  id: number | string;
  name: string;
  slug: string;
  type?: string;
  price: number;
  rating: number;
  reviews: number;
  category: ClothingCategory;
  /** Primary display image */
  img: string;
  image_main?: string;
  /** Flat lay image used in cart thumbnails */
  flatImg: string;
  /** All images in item folder */
  images?: string[];
  colors: string[];
  sizes: SizeOption[];
  desc?: string;
  description?: string;
  inStock?: boolean;
  featured?: boolean;
  active?: boolean;
  sort_order?: number;
}

export interface CategoryItem {
  id: ClothingCategory;
  name: string;
  slug: string;
  img: string;
  status: 'live' | 'coming-soon';
  description?: string;
}

// ---------------------------------------------------------------------------
// Cart / Bag
// ---------------------------------------------------------------------------

export interface CartItem {
  id: number | string;
  slug: string;
  name: string;
  price: number;
  qty: number;
  size: SizeOption;
  color: string;
  colorName?: string;
  flatImg: string;
  img?: string;
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

export interface FilterState {
  priceRange: [number, number];
  categories: ClothingCategory[];
  sizes: SizeOption[];
  colors: string[];
  inStockOnly: boolean;
  sortBy: 'featured' | 'price-asc' | 'price-desc' | 'rating';
}

// ---------------------------------------------------------------------------
// Static Data Interfaces
// ---------------------------------------------------------------------------

export interface WalkthroughSlide {
  title: string;
  subtitle: string;
  img: string;
}

export interface CustomerReview {
  id: string;
  productId: number | string;
  author: string;
  rating: number;
  date: string;
  title: string;
  comment: string;
  verified: boolean;
  sizeBought?: string;
  avatar?: string;
}

export interface Voucher {
  code: string;
  label: string;
  discountAmount: number;
}
