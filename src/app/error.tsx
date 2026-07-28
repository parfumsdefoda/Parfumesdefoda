"use client";

/**
 * Error boundary for the homepage.
 * Displays when critical data (products, settings) fails to load.
 * Includes a retry button that attempts to re-fetch the data.
 *
 * Note: This component renders outside the Provider tree,
 * so it cannot use the localization hook. Text matches
 * locales/ar.json keys: errors.loadFailed, errors.retry
 */

export default function Error({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center" role="alert">
      <div className="max-w-md">
        {/* Error illustration */}
        <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-neutral-100 flex items-center justify-center" aria-hidden="true">
          <span className="text-4xl">⚠️</span>
        </div>

        <h1 className="text-2xl font-bold text-neutral-800 mb-3">
          عذراً، حدث خطأ في تحميل البيانات
        </h1>

        <p className="text-neutral-500 mb-6 leading-relaxed">
          يرجى المحاولة مرة أخرى. إذا استمرت المشكلة، تواصل معنا عبر واتساب.
        </p>

        <button
          onClick={reset}
          className="inline-flex items-center justify-center h-11 px-8 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}
