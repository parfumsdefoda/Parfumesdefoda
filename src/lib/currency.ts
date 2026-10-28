/** Format customer-facing numbers with Arabic-Indic digits and separators. */
export function formatNumber(amount: number): string {
  return new Intl.NumberFormat("ar-EG").format(amount);
}

/** Format Egyptian Pounds using the shared customer-number formatter. */
export function formatPrice(amount: number): string {
  return `${formatNumber(amount)} ج.م`;
}

/** Localize the numeric prefix of a catalogue size without changing stored data. */
export function formatSizeLabel(label: string): string {
  const match = /^(\s*)(\d+(?:[.,]\d+)?)(.*)$/.exec(label);
  if (!match) return label;
  const amount = Number(match[2].replace(",", "."));
  return Number.isFinite(amount)
    ? `${match[1]}${formatNumber(amount)}${match[3]}`
    : label;
}
