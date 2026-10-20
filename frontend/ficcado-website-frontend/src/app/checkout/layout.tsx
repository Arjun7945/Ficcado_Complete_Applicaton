import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Checkout',
  description:
    'Review your order, enter delivery details, and select courier partner on Ficcado Clothing.',
};

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
