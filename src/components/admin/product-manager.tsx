"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Plus, X, ImageUp } from "lucide-react";
import { formatVnd } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  toggleActive,
  type ProductInput,
} from "@/app/admin/san-pham/actions";
import type { Category, Product } from "@/lib/types";

const empty: ProductInput = {
  name: "",
  description: "",
  price: 0,
  cost: 0,
  calo: 0,
  hsd: "",
  category_id: null,
  image_url: "",
  is_active: true,
};

export function ProductManager({
  products,
  categories,
}: {
  products: Product[];
  categories: Category[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductInput>(empty);
  const [err, setErr] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();

  async function uploadImage(file: File) {
    setUploading(true);
    setErr("");
    try {
      const supabase = createClient();
      const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      setForm((f) => ({ ...f, image_url: data.publicUrl }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lỗi tải ảnh");
    } finally {
      setUploading(false);
    }
  }

  function openAdd() {
    setEditId(null);
    setForm(empty);
    setErr("");
    setOpen(true);
  }
  function openEdit(p: Product) {
    setEditId(p.id);
    setForm({
      name: p.name,
      description: p.description ?? "",
      price: p.price,
      cost: p.cost,
      calo: p.calo,
      hsd: p.hsd ?? "",
      category_id: p.category_id,
      image_url: p.image_url ?? "",
      is_active: p.is_active,
    });
    setErr("");
    setOpen(true);
  }

  function save() {
    setErr("");
    start(async () => {
      const res = editId ? await updateProduct(editId, form) : await createProduct(form);
      if (res.ok) {
        setOpen(false);
        router.refresh();
      } else setErr(res.error ?? "Lỗi");
    });
  }
  function remove(id: string) {
    if (!confirm("Xóa sản phẩm này?")) return;
    start(async () => {
      await deleteProduct(id);
      router.refresh();
    });
  }
  function flip(p: Product) {
    start(async () => {
      await toggleActive(p.id, !p.is_active);
      router.refresh();
    });
  }

  const field = "w-full rounded-xl border border-border bg-paper px-3 py-2.5 text-sm outline-none focus:border-primary";

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Danh mục sản phẩm</h2>
        <button
          onClick={openAdd}
          className="flex items-center gap-1 rounded-full bg-foreground px-4 py-2 text-[11px] uppercase tracking-[0.12em] text-background"
        >
          <Plus className="h-4 w-4" /> Thêm sản phẩm
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-paper">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="p-3">Tên</th>
              <th className="p-3">Nhóm</th>
              <th className="p-3 text-right">Giá bán</th>
              <th className="p-3 text-right">Giá vốn</th>
              <th className="p-3">Bán</th>
              <th className="p-3 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3">{p.categories?.name ?? "—"}</td>
                <td className="p-3 text-right text-primary">{formatVnd(p.price)}</td>
                <td className="p-3 text-right text-muted-foreground">{formatVnd(p.cost)}</td>
                <td className="p-3">
                  <button
                    onClick={() => flip(p)}
                    className={`rounded-full px-2.5 py-1 text-[10px] uppercase ${
                      p.is_active ? "bg-emerald-100 text-emerald-700" : "bg-stone-200 text-stone-600"
                    }`}
                  >
                    {p.is_active ? "Đang bán" : "Ẩn"}
                  </button>
                </td>
                <td className="p-3">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => openEdit(p)} aria-label="Sửa" className="text-muted-foreground hover:text-foreground">
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button onClick={() => remove(p.id)} aria-label="Xóa" className="text-muted-foreground hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* form modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 p-4" onClick={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div className="max-h-[88vh] w-full max-w-lg overflow-auto rounded-2xl bg-paper p-6">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-xl font-semibold">{editId ? "Sửa sản phẩm" : "Thêm sản phẩm"}</h3>
              <button onClick={() => setOpen(false)} aria-label="Đóng">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <input className={field} placeholder="Tên sản phẩm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <textarea className={field} placeholder="Mô tả" value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <select className={field} value={form.category_id ?? ""} onChange={(e) => setForm({ ...form, category_id: e.target.value || null })}>
                  <option value="">— Nhóm —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <input className={field} placeholder="HSD (vd 48h)" value={form.hsd ?? ""} onChange={(e) => setForm({ ...form, hsd: e.target.value })} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <input type="number" className={field} placeholder="Giá bán" value={form.price || ""} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
                <input type="number" className={field} placeholder="Giá vốn" value={form.cost || ""} onChange={(e) => setForm({ ...form, cost: Number(e.target.value) })} />
                <input type="number" className={field} placeholder="Calo" value={form.calo || ""} onChange={(e) => setForm({ ...form, calo: Number(e.target.value) })} />
              </div>
              <div className="flex items-center gap-3">
                {form.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.image_url} alt="" className="h-14 w-14 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <ImageUp className="h-5 w-5" />
                  </div>
                )}
                <label className="cursor-pointer rounded-full border border-border px-4 py-2 text-[11px] uppercase tracking-wide">
                  {uploading ? "Đang tải…" : "Tải ảnh lên"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && uploadImage(e.target.files[0])}
                  />
                </label>
              </div>
              <input className={field} placeholder="hoặc dán URL ảnh" value={form.image_url ?? ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.is_active ?? true} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
                Đang bán
              </label>
              {err && <p className="text-sm text-red-600">{err}</p>}
              <button disabled={pending} onClick={save} className="w-full rounded-full bg-foreground py-3 text-[12px] uppercase tracking-[0.2em] text-background disabled:opacity-60">
                {pending ? "Đang lưu…" : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
