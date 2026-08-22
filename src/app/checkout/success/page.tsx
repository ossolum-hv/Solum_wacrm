import Link from 'next/link';

export default function CheckoutSuccessPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="rounded-full bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300">
        Payment successful
      </div>
      <h1 className="text-3xl font-semibold text-foreground">Thank you for your purchase</h1>
      <p className="text-muted-foreground">
        Your payment has been received and the order status is being updated.
      </p>
      <Link
        href="/products"
        className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Back to products
      </Link>
    </div>
  );
}
