import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Journal',
  description:
    'Explore the aesthetic core of Ficcado. Interactive aura canvas, 240 GSM combed cotton science, limited capsule philosophy, and our 2024 founding story.',
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
