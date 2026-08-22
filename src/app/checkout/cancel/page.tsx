import Link from 'next/link';

export default function CheckoutCancelPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="rounded-full bg-amber-500/15 px-4 py-2 text-sm font-medium text-amber-700 dark:text-amber-300">
        Payment cancelled
      </div>
      <h1 className="text-3xl font-semibold text-foreground">Checkout was cancelled</h1>
      <p className="text-muted-foreground">
        No charge was made. You can retry the checkout at any time.
      </p>
      <Link
        href="/products"
        className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Return to products
      </Link>
    </div>
  );
}
