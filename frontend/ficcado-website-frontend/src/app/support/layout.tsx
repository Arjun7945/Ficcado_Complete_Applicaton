import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Support',
  description:
    'Ficcado Customer Support — reach out for order tracking, size advice, complaints, or product inquiries. Dedicated response within 24 hours.',
};

export default function SupportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
