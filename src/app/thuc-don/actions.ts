"use server";

import { createClient } from "@/lib/supabase/server";
import type { PlaceOrderResult } from "@/lib/types";

export type CheckoutInput = {
  items: { product_id: string; qty: number; variant_id?: string | null }[];
  payment: string;
  address?: string | null;
  promoCode?: string | null;
};

export type CheckoutResult =
  | ({ ok: true } & PlaceOrderResult)
  | { ok: false; error: string };

// Đặt hàng: gọi RPC place_order (nguyên tử) với phiên đăng nhập hiện tại.
// Nếu user đã đăng nhập, auth.uid() trong RPC sẽ được tích điểm.
export async function placeOrderAction(input: CheckoutInput): Promise<CheckoutResult> {
  const { items, payment, address, promoCode } = input;
  if (!items || items.length === 0) return { ok: false, error: "Giỏ hàng trống" };

  const supabase = createClient();
  const { data, error } = await supabase.rpc("place_order", {
    p_items: items,
    p_payment: payment,
    p_source: "Khách đặt",
    p_address: address ?? null,
    p_promo_code: promoCode ?? null,
  });

  if (error) return { ok: false, error: error.message };
  return { ...(data as PlaceOrderResult), ok: true as const };
}
