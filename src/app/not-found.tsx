import Link from "next/link";

/**
 * 404 page — displayed when a requested route does not exist.
 * Minimal design with logo, message, and return link.
 *
 * Note: This is a static server component outside the Provider tree.
 * Text matches locales/ar.json keys: errors.pageNotFound, errors.backToHome
 */

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="max-w-md">
        <h1 className="text-6xl font-bold text-accent mb-4" aria-hidden="true">404</h1>

        <h2 className="text-2xl font-bold text-neutral-800 mb-3">
          الصفحة غير موجودة
        </h2>

        <p className="text-neutral-500 mb-8 leading-relaxed">
          عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
        </p>

        <Link
          href="/"
          className="inline-flex items-center justify-center h-11 px-8 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
        >
          العودة إلى الرئيسية
        </Link>
      </div>
    </div>
  );
}
