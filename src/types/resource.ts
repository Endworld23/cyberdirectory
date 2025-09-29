export type ResourceLite = {
  id: string;
  title: string;
  slug: string;
  description?: string | null;
  url?: string | null;
  logoUrl?: string | null;
  createdAt?: string | null;
  votes?: number | null;
  comments?: number | null;
  affiliateUrl?: string | null;
};
