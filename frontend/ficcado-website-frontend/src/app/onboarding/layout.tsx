import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Welcome',
  description:
    'Discover Ficcado — signature high quality streetwear crafted with uncompromising textile honesty.',
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
