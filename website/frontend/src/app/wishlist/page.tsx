import type { Metadata } from 'next';
import { WishlistClient } from './WishlistClient';

export const metadata: Metadata = {
  title: 'Saved Wishlist | Ficcado',
  description:
    'Curate and review your personal collection of saved unisex heavyweight t-shirts and streetwear drops from Ficcado.',
  openGraph: {
    title: 'Saved Wishlist | Ficcado',
    description:
      'Curate and review your personal collection of saved unisex heavyweight t-shirts and streetwear drops from Ficcado.',
  },
};

export default function WishlistPage() {
  return <WishlistClient />;
}
