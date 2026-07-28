import { Header, type HeaderProps } from "./header";
import { Footer, type FooterProps } from "./footer";

export interface PageLayoutProps {
  children: React.ReactNode;
  /** Props passed to the Header */
  headerProps?: HeaderProps;
  /** Props passed to the Footer */
  footerProps?: FooterProps;
  className?: string;
}

/**
 * PageLayout — wraps children with Header (top) and Footer (bottom).
 * Used by the homepage to compose the full page structure.
 * Pure presentational.
 */
export function PageLayout({
  children,
  headerProps,
  footerProps,
  className,
}: PageLayoutProps) {
  return (
    <div className={`flex min-h-screen flex-col ${className ?? ""}`}>
      <Header {...headerProps} />
      {/* Spacer for fixed header (h-24 = 96px) */}
      <div className="h-24 shrink-0" aria-hidden="true" />
      <main className="flex-1">{children}</main>
      <Footer {...footerProps} />
    </div>
  );
}
