import Link from "next/link";

export interface IntroBarProps {
  heading: string;
  viewAll: string;
}

/**
 * IntroBar — the top of the homepage.
 *
 * One hairline row on paper: the page's only h1 and the way into the full
 * catalogue. It replaces the old hero (image, overlay, two buttons) so the home
 * opens on type rather than on a photograph, and the first product grid starts
 * immediately below it.
 */
export function IntroBar({ heading, viewAll }: IntroBarProps) {
  return (
    <section
      aria-labelledby="home-intro"
      className="border-b border-[var(--line)] bg-[var(--paper)]"
    >
      <div className="mx-auto flex w-full max-w-[1920px] items-end justify-between gap-6 px-4 py-10 sm:px-6 sm:py-14">
        <h1
          id="home-intro"
          className="max-w-[22ch] text-[28px] font-semibold leading-[1.1] tracking-tight text-[var(--ink)] sm:text-[40px]"
        >
          {heading}
        </h1>
        <Link
          href="/shop"
          className="shrink-0 pb-1 text-[14px] font-medium text-[var(--ink)] underline decoration-[var(--line)] underline-offset-[6px] transition-colors hover:decoration-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2"
        >
          {viewAll}
        </Link>
      </div>
    </section>
  );
}
