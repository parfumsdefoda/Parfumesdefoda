/**
 * CatalogBanner — the typographic shelf plate shared by /shop and the category
 * routes.
 *
 * A catalogue page does not get the homepage banner: it gets a short band of the
 * brand gradient with the page's own <h1>, so the catalogue starts almost
 * immediately and the grid keeps the vertical room.
 */
export interface CatalogBannerProps {
  title: string;
  lead?: string;
}

export function CatalogBanner({ title, lead }: CatalogBannerProps) {
  return (
    <section className="relative isolate overflow-hidden border-b border-[var(--brand-gold)] bg-[var(--purple-950)] py-10 md:py-14">
      <span aria-hidden="true" className="hero-glow" />
      <span aria-hidden="true" className="hero-lattice" />
      <div className="relative mx-auto w-full max-w-[1600px] px-4 lg:px-6">
        <h1 className="text-[30px] font-semibold leading-tight text-[var(--color-on-dark)] md:text-[40px]">
          {title}
        </h1>
        {lead && (
          <p className="mt-2 max-w-[52ch] text-[15px] leading-relaxed text-[var(--color-on-dark-muted)]">
            {lead}
          </p>
        )}
      </div>
    </section>
  );
}
