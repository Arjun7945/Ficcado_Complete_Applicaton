import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Search',
  description:
    'Search high quality T-shirts, categories, and limited drop collections on Ficcado Clothing.',
};

export default function SearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
