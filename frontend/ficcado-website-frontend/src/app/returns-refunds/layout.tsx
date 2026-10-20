import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Returns & Refunds',
  description:
    'Comprehensive return, exchange, and refund policies for Ficcado Clothing.',
};

export default function ReturnsRefundsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
