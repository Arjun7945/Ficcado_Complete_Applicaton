import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'WhatsApp Continue',
  description:
    'Complete and finalize your Ficcado order directly on WhatsApp with our team.',
};

export default function WhatsAppContinueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
