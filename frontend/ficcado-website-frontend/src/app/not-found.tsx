import Link from 'next/link';
import { Home, ShoppingBag, HelpCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#0d0d0d] text-zinc-100 flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-800/80 border border-zinc-700/50 text-zinc-400 mb-2">
          <span className="text-2xl font-bold tracking-wider font-mono">404</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Page Not Found
          </h1>
          <p className="text-sm text-zinc-400">
            The collection, page, or resource you are looking for doesn’t exist or has moved.
          </p>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-colors shadow-sm"
          >
            <Home className="w-4 h-4" />
            Return to Storefront
          </Link>
          <Link
            href="/categories/t-shirts"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-zinc-800 text-zinc-200 font-medium text-sm hover:bg-zinc-700 transition-colors border border-zinc-700/60"
          >
            <ShoppingBag className="w-4 h-4" />
            Explore T-Shirts
          </Link>
        </div>

        <div className="pt-8 border-t border-zinc-800/80">
          <Link
            href="/support"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Need assistance? Contact Ficcado Support
          </Link>
        </div>
      </div>
    </main>
  );
}
