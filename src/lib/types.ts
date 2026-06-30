// Kiểu dữ liệu dùng chung, khớp với schema Supabase

export type Category = {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
};

export type ProductVariant = {
  id: string;
  product_id: string;
  label: string;
  price: number;
  sort: number;
};

export type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  cost: number;
  calo: number;
  hsd: string | null;
  image_url: string | null;
  category_id: string | null;
  is_active: boolean;
  is_combo?: boolean;
  categories?: Pick<Category, "name" | "slug"> | null;
  product_variants?: ProductVariant[];
};

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: "customer" | "staff" | "manager" | "admin";
  rank: string;
  points: number;
  total_spend: number;
};

export type Ingredient = {
  id: string;
  name: string;
  unit: string;
  stock: number;
  min_stock: number;
};

export type Order = {
  id: string;
  code: string;
  user_id: string | null;
  customer_name: string | null;
  source: string;
  status: string;
  total_amount: number;
  payment: string;
  shipping_address: string | null;
  created_at: string;
  order_items?: OrderItem[];
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  price: number;
};

// Kết quả trả về từ RPC place_order
export type PlaceOrderResult = {
  ok: boolean;
  code: string;
  total: number;
  earned: number;
  logged_in: boolean;
  low_stock: { id: string; name: string; stock: number; min_stock: number }[];
};
