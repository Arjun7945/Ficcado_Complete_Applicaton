import Link from 'next/link';
import { Home, ShoppingBag, HelpCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--primary-light)] border border-[var(--accent-ice)] text-[var(--primary)] mb-2">
          <span className="text-2xl font-bold tracking-wider font-mono">404</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-[var(--text-main)] sm:text-4xl">
            Page Not Found
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            The collection, page, or resource you are looking for doesn’t exist or has moved.
          </p>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold shadow-sm cursor-pointer"
          >
            <Home className="w-4 h-4" />
            Return to Storefront
          </Link>
          <Link
            href="/categories/t-shirts"
            className="btn-secondary inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            Explore T-Shirts
          </Link>
        </div>

        <div className="pt-8 border-t border-[var(--border-light)]">
          <Link
            href="/support"
            className="inline-flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Need assistance? Contact Ficcado Support
          </Link>
        </div>
      </div>
    </main>
  );
}
