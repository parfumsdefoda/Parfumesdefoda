"use client";

import { useEffect } from "react";
import "./globals.css";

/**
 * Root-level error boundary.
 *
 * It replaces the root layout when the layout itself fails, so it renders its
 * own <html>/<body> and imports the token stylesheet directly — everything
 * else (providers, header, footer) is gone at this point. Text is hardcoded
 * Arabic because no locale data can be loaded from here.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log only the digest: exception messages can contain request content.
    if (error.digest) console.error("[global-error] render failed", error.digest);
  }, [error.digest]);

  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 px-4 text-center">
          <h1 className="text-title-2 font-bold">عذرًا، حدث خطأ</h1>
          <p className="text-body text-[var(--color-text-muted)]">
            تعذّر تحميل الصفحة الآن. يمكنك المحاولة مرة أخرى.
          </p>
          <button
            type="button"
            onClick={reset}
            className="min-h-11 rounded-pill bg-[var(--color-brand)] px-6 font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
          >
            إعادة المحاولة
          </button>
        </main>
      </body>
    </html>
  );
}
