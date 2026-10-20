import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Replacements & Damages',
  description:
    'Dedicated support and replacement procedures for transit damages or defective items on Ficcado Clothing.',
};

export default function ReplacementsDamagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
