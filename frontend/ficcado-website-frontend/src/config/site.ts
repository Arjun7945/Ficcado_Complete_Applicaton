// =============================================================================
// Site & Brand Configuration — /src/config/site.ts
// Single source of truth for brand metadata, defaults, and static content.
// =============================================================================

import type { FilterState, WalkthroughSlide } from '@/types';
import { getSiteUrl } from '@/lib/siteUrl';

export const BRAND = {
  name: 'Ficcado Clothing',
  legalName: 'Ficcado Clothing',
  tagline: 'High Quality Unisex Wears',
  logo: '/images/brand_logo/Ficcado Brand Logo.jpeg',
  description:
    'Ficcado Clothing crafts signature high quality unisex streetwear with 240 GSM combed cotton. Direct WhatsApp ordering and verified pan-India dispatch.',
  get url() {
    return getSiteUrl();
  },
  support: 'ficcado.clothing@gmail.com',
  supportEmail: 'ficcado.clothing@gmail.com',
  privacyEmail: 'ficcado.clothing@gmail.com',
  brandEmail: 'ficcado.clothing@gmail.com',
  enquiryEmail: 'ficcado.clothing@gmail.com',
  phone: '6282000729',
  phoneFormatted: '+91 6282000729',
  phoneDisplay: '+91 6282000729',
  supportHours: '7:00 AM to 7:00 PM IST',
  gst: '32CVNPR0498H1Z5',
  deliverySalesRegion: 'All India',
  minUserAge: 18,
  pog: {
    name: 'Rohith Murali',
    email: 'rohithficcado@gmail.com',
    role: 'Point of Grievance (POG) Contact',
  },
  liveChat: {
    channel: 'Available through contact and WhatsApp',
    timing: 'Mon–Fri, 10:00 AM – 6:00 PM IST',
    timingShort: 'Mon-Friday from 10am - 6pm',
  },
  whatsapp: '916282000729',
  instagram: 'https://instagram.com/ficcado.store',
  address: {
    line1: 'Manadath House',
    line2: 'Thaikkattukara P O',
    city: 'Aluva 6',
    pin: '683106',
    pincode: '683106',
    landmark: 'Opposite metro pillar 116',
    full: 'Manadath House, Thaikkattukara P O, Aluva 6, Pin: 683106 (Opposite metro pillar 116)',
  },
};

export const DEFAULT_FILTER_STATE: FilterState = {
  priceRange: [1, 5000],
  categories: [],
  sizes: [],
  colors: [],
  inStockOnly: false,
  sortBy: 'featured',
};

export const TRENDING_TAGS: string[] = [
  'Chosen',
  'Grounded',
  'Remember',
  'Reminder',
  'Echoes of the Empire',
  'Frame The Bloom',
  'Silent Sentinel',
  'The Watchers',
  '240 GSM Cotton',
  'Oversized Drop',
];

export const WALKTHROUGH_DATA: WalkthroughSlide[] = [
  {
    title: 'Ficcado T-Shirt Drops',
    subtitle:
      'Explore curated high quality unisex t-shirts today with signature architectural drapes and premium comfort.',
    img: '/images/walkthrough/ficcado_walkthrough_1.jpg',
  },
  {
    title: 'Engineered For Contemporary Living',
    subtitle:
      'Premium high quality 240 GSM cotton, precision tailored silhouettes, and unisex comfort crafted for longevity.',
    img: '/images/walkthrough/ficcado_walkthrough_2.jpg',
  },
  {
    title: 'Direct WhatsApp Ordering',
    subtitle:
      'Browse our drops, configure your bag, and connect directly with our team on WhatsApp for sizing care and fulfillment.',
    img: '/images/walkthrough/ficcado_walkthrough_3.jpg',
  },
];
