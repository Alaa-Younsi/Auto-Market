export type OrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";

export type DeliveryType = "home" | "office";

export type ProductStatus = "active" | "draft";

export interface Category {
  id: string;
  slug: string;
  name_fr: string;
  name_ar: string;
  description_fr: string | null;
  description_ar: string | null;
  image_url: string | null;
  sort_order: number;
  created_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt: string | null;
  sort_order: number;
}

/** "free": order buy+get units, pay for buy. "price": every qty units cost price total. */
export type QuantityOffer =
  | { type: "free"; buy: number; get: number }
  | { type: "price"; qty: number; price: number };

/** One option inside a custom variant group. `image_url` is optional — when
    set, picking this option on the product page swaps the main gallery image,
    exactly like a colour swatch photo. Stored in the `products.variants` jsonb;
    no migration — rows saved before this carried `values` as plain strings and
    are normalised on read (see `src/lib/variants.ts`). */
export interface ProductVariantValue {
  value: string;
  image_url?: string | null;
}

/** A custom variant axis beyond the built-in color/size, e.g. "Matériau" / "مادة". */
export interface ProductVariantGroup {
  name_fr: string;
  name_ar: string;
  values: ProductVariantValue[];
}

/** A color swatch. `image_url` is optional — when set, picking this swatch
    on the product page jumps the gallery to that photo. */
export interface ProductColor {
  label_fr: string;
  label_ar: string;
  hex: string;
  image_url?: string | null;
}

/** A shopper's pick for one custom variant group — snapshotted onto the order
    line the same way color/size are, so it stays readable if the product's
    variants are edited or removed later. */
export interface SelectedVariant {
  name_fr: string;
  name_ar: string;
  value: string;
}

export interface Product {
  id: string;
  slug: string;
  name_fr: string;
  name_ar: string;
  description_fr: string | null;
  description_ar: string | null;
  details_fr: string[];
  details_ar: string[];
  price: number;
  compare_at_price: number | null;
  category_id: string | null;
  stock: number;
  style_code: string | null;
  colors: ProductColor[];
  sizes: string[];
  variants: ProductVariantGroup[];
  featured: boolean;
  status: ProductStatus;
  video_url: string | null;
  quantity_offers: QuantityOffer[];
  created_at: string;
  updated_at: string;
  product_images?: ProductImage[];
  category?: Category;
}

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  wilaya: string;
  city: string;
  /* Dropped from checkout — still present on orders placed before that change. */
  address: string | null;
  notes: string | null;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  status: OrderStatus;
  language: string;
  delivery_type: DeliveryType;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  name_fr: string;
  name_ar: string;
  price: number;
  quantity: number;
  color: string | null;
  size: string | null;
  variants: SelectedVariant[];
  image_url: string | null;
}

export interface StoreSettings {
  id: number;
  shipping_fee: number;
  /** null = no free-shipping offer; place_order and resolveShipping both treat it as "off". */
  free_ship_threshold: number | null;
  /* Migration 0013 — edited in Admin → Réglages. Optional: absent before it runs. */
  contact_phone?: string | null;
  contact_whatsapp?: string | null;
  contact_email?: string | null;
  address_fr?: string | null;
  address_ar?: string | null;
  hours_fr?: string | null;
  hours_ar?: string | null;
  social_instagram?: string | null;
  social_facebook?: string | null;
  social_tiktok?: string | null;
  social_youtube?: string | null;
  social_snapchat?: string | null;
  legal_name?: string | null;
  legal_owner?: string | null;
  legal_rc?: string | null;
  legal_nif?: string | null;
  legal_nis?: string | null;
  legal_ai?: string | null;
}

/** The Réglages columns — the only keys the settings form ever writes. */
export const SETTINGS_TEXT_KEYS = [
  "contact_phone",
  "contact_whatsapp",
  "contact_email",
  "address_fr",
  "address_ar",
  "hours_fr",
  "hours_ar",
  "social_instagram",
  "social_facebook",
  "social_tiktok",
  "social_youtube",
  "social_snapchat",
  "legal_name",
  "legal_owner",
  "legal_rc",
  "legal_nif",
  "legal_nis",
  "legal_ai",
] as const;
export type SettingsTextKey = (typeof SETTINGS_TEXT_KEYS)[number];

export interface DeliveryPrice {
  id: string;
  wilaya: string;
  home_price: number;
  office_price: number;
  active: boolean;
  updated_at: string;
}

export interface ClientReview {
  id: string;
  client_name: string;
  stars: number;
  review_text: string;
  image_url: string | null;
  active: boolean;
  created_at: string;
}

export interface CartItem {
  productId: string;
  slug: string;
  nameFr: string;
  nameAr: string;
  price: number;
  quantity: number;
  color?: string;
  size?: string;
  variants?: SelectedVariant[];
  imageUrl: string | null;
  stock: number;
  /** For category promotions in the instant mirror; price_cart re-reads it server-side. */
  categoryId?: string | null;
  /* Snapshot for the client-side estimate only — place_order re-reads
     the live offers server-side. */
  offers?: QuantityOffer[];
}

export interface PlaceOrderItem {
  product_id: string;
  quantity: number;
  color?: string;
  size?: string;
  variants?: SelectedVariant[];
}

export interface PlaceOrderCustomer {
  customer_name: string;
  customer_phone: string;
  wilaya: string;
  city: string;
  delivery_type: DeliveryType;
  language: string;
}

export type TrackingProvider = "meta" | "tiktok";
export type TrackingScope = "all" | "paths" | "products";
export type TrackingEventKey =
  | "page_view"
  | "view_content"
  | "add_to_cart"
  | "initiate_checkout"
  | "purchase";

export interface TrackingPixel {
  id: string;
  provider: TrackingProvider;
  label: string;
  pixel_id: string;
  active: boolean;
  scope: TrackingScope;
  match_values: string[];
  events: Partial<Record<TrackingEventKey, boolean>>;
  sort_order: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** The editable columns only — never a spread of a loaded row (PGRST204). */
export type TrackingPixelInput = Omit<TrackingPixel, "id" | "created_at" | "updated_at">;
