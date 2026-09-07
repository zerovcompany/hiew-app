export type Profile = {
  id: string;
  line_user_id: string | null;
  display_name: string;
  avatar_url: string | null;
  phone: string | null;
  promptpay_id: string | null;
  is_buyer: boolean;
  is_carrier: boolean;
  carrier_verified: boolean;
  rating_avg: number;
  rating_count: number;
  is_admin?: boolean;
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
  buyer_note: string | null;
  created_at: string;
};
