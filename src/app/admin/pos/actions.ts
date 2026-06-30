"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type CrmCustomer = {
  id: string;
  code: string | null;
  phone: string;
  name: string;
  rank: string;
  points: number;
};

// Tra cứu khách hàng CRM theo số điện thoại (POS)
export async function findCustomer(phone: string): Promise<CrmCustomer | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("customers")
    .select("id, code, phone, name, rank, points")
    .eq("phone", phone.trim())
    .maybeSingle();
  return (data as CrmCustomer) ?? null;
}

export type PosInput = {
  items: { product_id: string; qty: number; variant_id?: string | null }[];
  payment: string;
  customerId?: string | null;
  redeem?: number;
  servedBy?: string | null;
  promoCode?: string | null;
};

export type PosResult =
  | { ok: true; code: string; total: number; discount: number; redeemed: number; earned: number }
  | { ok: false; error: string };

// Thanh toán tại quầy: gọi RPC place_order với source 'Tại quầy'
export async function posCheckout(input: PosInput): Promise<PosResult> {
  if (!input.items?.length) return { ok: false, error: "Chưa chọn món" };
  const supabase = createClient();
  const { data, error } = await supabase.rpc("place_order", {
    p_items: input.items,
    p_payment: input.payment,
    p_source: "Tại quầy",
    p_address: null,
    p_crm_customer_id: input.customerId ?? null,
    p_redeem: input.redeem ?? 0,
    p_served_by: input.servedBy ?? null,
    p_promo_code: input.promoCode ?? null,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  const d = data as { code: string; total: number; discount: number; redeemed: number; earned: number };
  return { ok: true, ...d };
}
