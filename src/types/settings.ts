/**
 * Settings types — matches the schema in data/settings.json.
 */
export interface StoreSettings {
  store: {
    name: string;
    website: string;
    currency: string;
    language: string;
    direction: string;
  };
  grid: {
    desktop: number;
    tablet: number;
    mobile: number;
  };
  theme?: {
    colors: Record<string, string>;
    typography?: Record<string, string>;
    spacing?: Record<string, string>;
    radius?: Record<string, string>;
    shadows?: Record<string, string>;
    animations?: Record<string, string>;
  };
  contact?: {
    whatsapp: string;
    email: string;
    phone?: string;
  };
  social?: Record<string, string>;
}
