"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { receiveStock } from "@/app/admin/nhap-kho/actions";
import type { Ingredient } from "@/lib/types";

export function ReceiveStockForm({ ingredients }: { ingredients: Ingredient[] }) {
  const router = useRouter();
  const [ingredientId, setIngredientId] = useState(ingredients[0]?.id ?? "");
  const [batchCode, setBatchCode] = useState("");
  const [qty, setQty] = useState<number>(0);
  const [expiry, setExpiry] = useState("");
  const [qc, setQc] = useState<"passed" | "rejected" | "pending">("passed");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  function submit() {
    setMsg(null);
    start(async () => {
      const res = await receiveStock({
        ingredient_id: ingredientId,
        batch_code: batchCode,
        qty,
        expiry: expiry || null,
        qc_status: qc,
        qc_note: note || null,
      });
      if (res.ok) {
        setMsg({ ok: true, text: qc === "passed" ? "Đã nhập kho & cộng tồn." : "Đã ghi nhận lô (QC chưa đạt — không cộng tồn)." });
        setBatchCode("");
        setQty(0);
        setExpiry("");
        setNote("");
        router.refresh();
      } else {
        setMsg({ ok: false, text: res.error ?? "Lỗi" });
      }
    });
  }

  const field = "w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-sm outline-none focus:border-primary";

  return (
    <div className="max-w-lg space-y-3 rounded-2xl border border-border bg-paper p-5">
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Nguyên liệu</label>
        <select className={field} value={ingredientId} onChange={(e) => setIngredientId(e.target.value)}>
          {ingredients.map((i) => (
            <option key={i.id} value={i.id}>
              {i.id} — {i.name} (tồn {i.stock}{i.unit})
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Mã lô</label>
          <input className={field} value={batchCode} onChange={(e) => setBatchCode(e.target.value)} placeholder="PN-20260630-01" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Số lượng</label>
          <input type="number" className={field} value={qty || ""} onChange={(e) => setQty(Number(e.target.value))} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Hạn sử dụng</label>
          <input type="date" className={field} value={expiry} onChange={(e) => setExpiry(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Kết quả QC đầu vào</label>
          <select className={field} value={qc} onChange={(e) => setQc(e.target.value as typeof qc)}>
            <option value="passed">Đạt</option>
            <option value="rejected">Không đạt (trả NCC)</option>
            <option value="pending">Chờ kiểm</option>
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">Ghi chú QC</label>
        <input className={field} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Màu sắc, mùi, độ tươi…" />
      </div>

      {msg && (
        <p className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.text}</p>
      )}

      <button
        disabled={pending}
        onClick={submit}
        className="w-full rounded-full bg-foreground py-3 text-[12px] uppercase tracking-[0.2em] text-background disabled:opacity-60"
      >
        {pending ? "Đang nhập…" : "Nhập kho"}
      </button>
    </div>
  );
}
