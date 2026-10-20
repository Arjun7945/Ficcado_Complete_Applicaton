import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'The 2024 Founding Story of Ficcado by Sinan MS, Ganga Lakshmi, and Rohith Murali. High quality apparel craftsmanship and brand mission.',
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
