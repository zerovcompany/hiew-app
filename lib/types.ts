export type Profile = {
  id: string;
  line_user_id: string | null;
  line_friend: boolean;
  display_name: string;
  avatar_url: string | null;
  phone: string | null;
  promptpay_id: string | null;
  bank_code: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  is_buyer: boolean;
  is_carrier: boolean;
  carrier_verified: boolean;
  rating_avg: number;
  rating_count: number;
  is_admin?: boolean;
};

export type BuyerAddress = {
  id: string; profile_id: string; label: string; recipient_name: string; phone: string; address_text: string;
  province: string | null; district: string | null; subdistrict: string | null; postal_code: string | null;
  latitude: number | null; longitude: number | null; is_default: boolean; created_at: string; updated_at: string;
};

export type VerificationStatus = "pending" | "approved" | "rejected";

export type CarrierVerification = {
  id: string;
  profile_id: string;
  status: VerificationStatus;
  reject_reason: string | null;
  created_at: string;
  id_card_url_signed?: string;
  selfie_url_signed?: string;
  profiles?: Pick<Profile, "display_name" | "phone" | "avatar_url">;
};

export type Shop = {
  id: string;
  name: string;
  category: string | null;
  image_url: string | null;
  address_hint: string | null;
  order_count: number;
  created_at?: string;
};

export type PromoBanner = {
  id: string;
  image_url: string;
  link_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
};

export type TripStatus = "open" | "closed" | "completed" | "cancelled";

export type CarrierTrip = {
  id: string;
  carrier_id: string;
  shop_id: string | null;
  shop_name_text: string;
  description: string | null;
  order_cutoff_at: string;
  delivery_date: string;
  delivery_time_start: string;
  delivery_time_end: string;
  delivery_location: string;
  service_fee: number;
  fee_type: "per_order" | "per_item" | "flat";
  max_orders: number | null;
  status: TripStatus;
  cover_image_url: string | null;
  profiles?: Profile;
  shops?: Shop;
};

export type TripMenuItem = {
  id: string;
  trip_id: string;
  item_name: string;
  reference_price: number | null;
};

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "purchased"
  | "delivered"
  | "cancelled";

export type PaymentMethod = "pay_now" | "pay_on_delivery";
export type PaymentStatus = "unpaid" | "paid";
export type PaymentChannel = "promptpay" | "bank_account";

export type Order = {
  id: string;
  trip_id: string;
  buyer_id: string;
  item_description: string;
  quantity: number;
  item_price: number | null;
  service_fee_snapshot: number;
  total_price: number;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  payment_channel: PaymentChannel | null;
  payment_slip_url: string | null;
  buyer_note: string | null;
  created_at: string;
  profiles?: Pick<Profile, "display_name" | "phone" | "avatar_url">;
  delivery_name: string | null; delivery_phone: string | null; delivery_address: string | null;
  delivery_province: string | null; delivery_district: string | null; delivery_subdistrict: string | null; delivery_postal_code: string | null;
  delivery_latitude: number | null; delivery_longitude: number | null;
  cancelled_by: string | null; cancel_reason: string | null; cancelled_at: string | null;
};
