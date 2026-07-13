export type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipped"
  | "delivered"
  | "cancelled";

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
  colors: string[];
  sizes: string[];
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
  address: string;
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
  image_url: string | null;
}

export interface StoreSettings {
  id: number;
  shipping_fee: number;
  free_ship_threshold: number;
}

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
  imageUrl: string | null;
  stock: number;
  /* Snapshot for the client-side estimate only — place_order re-reads
     the live offers server-side. */
  offers?: QuantityOffer[];
}

export interface PlaceOrderItem {
  product_id: string;
  quantity: number;
  color?: string;
  size?: string;
}

export interface PlaceOrderCustomer {
  customer_name: string;
  customer_phone: string;
  wilaya: string;
  city: string;
  address: string;
  notes?: string;
  delivery_type: DeliveryType;
  language: string;
}
