import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shipping & Delivery',
  description:
    'Shipping timelines, courier dispatch details, and pan-India delivery rates for Ficcado Clothing.',
};

export default function ShippingDeliveryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
