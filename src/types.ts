export interface FurnitureSet {
  id: string;
  name: string;
  price: string;
  description: string[];
  images: string[];
  videos: string[];
  isAbout?: boolean;
  isHidden?: boolean;
  createdAt?: number;
}

export interface SiteSettings {
  siteName?: string;
  whatsappNumbers: { label: string; number: string }[];
  socialLinks: { platform: string; url: string }[];
  contactEmail?: string;
  catalogPdfUrl?: string;
  currencies?: string[];
}
