import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Categories',
  description:
    'Explore Ficcado categories — signature high quality unisex T-shirts and upcoming apparel collections.',
};

export default function CategoriesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
