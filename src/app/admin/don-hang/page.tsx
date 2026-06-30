import { createClient } from "@/lib/supabase/server";
import { OrdersAdmin } from "@/components/admin/orders-admin";
import type { Order } from "@/lib/types";

export default async function AdminOrdersPage() {
  const supabase = createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Order[]>();

  return <OrdersAdmin orders={orders ?? []} />;
}
